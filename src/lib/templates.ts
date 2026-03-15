import type { TemplateType } from "@prisma/client";

import { formatDisplayDate } from "@/lib/dates";

export function generateSubmissionTitle(input: {
  templateType: TemplateType;
  sessionDate: Date | string;
  subspecialty?: string | null;
  residencyProgram?: string | null;
  customTitle?: string | null;
}): string {
  const formattedDate = formatDisplayDate(input.sessionDate);

  switch (input.templateType) {
    case "standard":
      return `Virtual Morning Report - ${formattedDate}`;
    case "raphael_medina_subspecialty":
      return `Raphael Medina Subspecialty VMR - ${input.subspecialty?.trim() ?? ""} - ${formattedDate}`;
    case "img_vmr":
      return `IMG Virtual Morning Report - ${input.residencyProgram?.trim() ?? ""} - ${formattedDate}`;
    case "sunday_fundamentals":
      return `Sunday Fundamentals VMR - ${formattedDate}`;
    case "custom":
      return input.customTitle?.trim() ?? "";
  }
}

export function getTemplateBaseSlug(templateType: TemplateType): string {
  switch (templateType) {
    case "standard":
      return "virtual-morning-report";
    case "raphael_medina_subspecialty":
      return "raphael-medina-subspecialty-vmr";
    case "img_vmr":
      return "img-virtual-morning-report";
    case "sunday_fundamentals":
      return "sunday-fundamentals-vmr";
    case "custom":
      return "custom-vmr";
  }
}
