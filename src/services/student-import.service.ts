import { prisma } from "../db.js";
import type { User } from "@prisma/client";
import Papa from "papaparse";
import * as XLSX from "xlsx";

interface StudentInput {
  aparIdOrPan: string;
  rollNo?: string;
  name: string;
  dateOfBirth?: string;
  currentAddress?: string;
  guardianMobileNo?: string;
  gender?: string;
  religion?: string;
  bloodGroup?: string;
  class: string;
  section: string;
}

interface ImportArgs {
  file: any;
  user: User;
  schoolCode?: string;
}

export const processStudentImport = async ({
  file,
  user,
  schoolCode,
}: ImportArgs) => {
  /* ---------- Resolve school ---------- */
  let schoolId: number;

  if (user.role === "SCHOOL_ADMIN") {
    if (!user.schoolId) {
      throw new Error("School admin not linked to any school");
    }
    schoolId = user.schoolId;
  } else {
    if (!schoolCode) {
      throw new Error("schoolCode required for SUPER_ADMIN");
    }

    const school = await prisma.school.findUnique({
      where: { code: schoolCode },
    });

    if (!school) throw new Error("Invalid schoolCode");
    schoolId = school.id;
  }

  /* ---------- Parse file (CSV or Excel) ---------- */
  const rows = parseFile(file) as StudentInput[];

  if (!rows || rows.length === 0) {
    throw new Error("File is empty or could not be parsed");
  }

  /* ---------- Load existing classes + sections ---------- */
  const classes = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: true },
  });

  const classMap = new Map(classes.map((c: any) => [c.name.toLowerCase(), c]));

  /* ---------- Detect existing students ---------- */
  const aparIdOrPans = rows.map((s) => s.aparIdOrPan).filter(Boolean);

  const existingStudents = await prisma.student.findMany({
    where: {
      aparIdOrPan: { in: aparIdOrPans },
      schoolId,
    },
    select: { aparIdOrPan: true },
  });

  const existingSet = new Set(existingStudents.map((s: any) => s.aparIdOrPan));

  /* ---------- Prepare results ---------- */
  const studentsToInsert: any[] = [];
  const errors: { row: number; reason: string }[] = [];
  let duplicateCount = 0;

  /* ---------- Process rows ---------- */
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      if (!row || !row.aparIdOrPan || !row.name || !row.class || !row.section) {
        throw new Error(
          "Missing required fields: aparIdOrPan, name, class, section",
        );
      }

      /* ----- Duplicate check ----- */
      if (existingSet.has(row.aparIdOrPan)) {
        duplicateCount++;
        continue;
      }

      /* ----- Ensure class (case-insensitive) ----- */
      const classKeyLower = row.class.toLowerCase();
      let cls = classMap.get(classKeyLower);
      if (!cls) {
        cls = await prisma.class.create({
          data: {
            name: row.class,
            schoolId,
          },
          include: { sections: true },
        });
        classMap.set(classKeyLower, cls);
      }

      /* ----- Ensure section ----- */
      let section = (cls as any).sections.find(
        (s: any) => s.name.toLowerCase() === row.section.toLowerCase(),
      );
      if (!section) {
        section = await prisma.section.create({
          data: {
            name: row.section,
            classId: (cls as any).id,
          },
        });
        (cls as any).sections.push(section);
      }

      /* ----- Parse date of birth ----- */
      let dateOfBirth: Date | null = null;
      if (row.dateOfBirth) {
        const parsed = new Date(row.dateOfBirth);
        if (!isNaN(parsed.getTime())) {
          dateOfBirth = parsed;
        }
      }

      /* ----- Prepare insert with all fields ----- */
      studentsToInsert.push({
        aparIdOrPan: row.aparIdOrPan,
        rollNo: row.rollNo || null,
        name: row.name,
        dateOfBirth: dateOfBirth,
        currentAddress: row.currentAddress || null,
        guardianMobileNo: row.guardianMobileNo || null,
        gender: row.gender || null,
        religion: row.religion || null,
        bloodGroup: row.bloodGroup || null,
        schoolId,
        classId: (cls as any).id,
        sectionId: section.id,
      });
    } catch (err: any) {
      errors.push({
        row: i + 2, // +1 for header, +1 for zero-index
        reason: err.message,
      });
    }
  }

  /* ---------- Bulk insert ---------- */
  if (studentsToInsert.length > 0) {
    await prisma.student.createMany({
      data: studentsToInsert,
      skipDuplicates: true,
    });
  }

  /* ---------- Return response ---------- */
  return {
    total: rows.length,
    inserted: studentsToInsert.length,
    duplicates: duplicateCount,
    skipped: duplicateCount + errors.length,
    errors,
  };
};

const parseFile = (file: any): StudentInput[] => {
  const ext = file.originalname.split(".").pop()?.toLowerCase();

  if (ext === "csv") {
    const csvText = file.buffer.toString("utf-8");
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      throw new Error(
        `CSV Parse Error: ${parsed.errors[0]?.message || "Unknown error"}`,
      );
    }

    return (parsed.data as unknown[]).map((row: any) => ({
      aparIdOrPan: (row.aparIdOrPan || row["APARID/PAN NUMBER"])?.trim(),
      rollNo: (row.rollNo || row["Roll No"])?.trim(),
      name: (row.name || row["Student Name"])?.trim(),
      dateOfBirth: (row.dateOfBirth || row["Date of Birth"])?.trim(),
      currentAddress: (row.currentAddress || row["Current Address"])?.trim(),
      guardianMobileNo: (
        row.guardianMobileNo || row["Parent's/Guardian Mobile No"]
      )?.trim(),
      gender: row.gender?.trim(),
      religion: row.religion?.trim(),
      bloodGroup: (row.bloodGroup || row["Blood Group"])?.trim(),
      class: row.class?.trim(),
      section: row.section?.trim(),
    }));
  }

  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error("Excel file has no sheets");
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error("Unable to read Excel sheet");
    }

    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    return rows.map((row) => ({
      aparIdOrPan: (row.aparIdOrPan || row["APARID/PAN NUMBER"])
        ?.toString()
        .trim(),
      rollNo: (row.rollNo || row["Roll No"])?.toString().trim(),
      name: (row.name || row["Student Name"])?.toString().trim(),
      dateOfBirth: (row.dateOfBirth || row["Date of Birth"])?.toString().trim(),
      currentAddress: (row.currentAddress || row["Current Address"])
        ?.toString()
        .trim(),
      guardianMobileNo: (
        row.guardianMobileNo || row["Parent's/Guardian Mobile No"]
      )
        ?.toString()
        .trim(),
      gender: row.gender?.toString().trim(),
      religion: row.religion?.toString().trim(),
      bloodGroup: (row.bloodGroup || row["Blood Group"])?.toString().trim(),
      class: row.class?.toString().trim(),
      section: row.section?.toString().trim(),
    }));
  }

  throw new Error(
    "Unsupported file type. Only CSV and Excel (.xlsx, .xls) are supported",
  );
};
