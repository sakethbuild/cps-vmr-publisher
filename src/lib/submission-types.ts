import { z } from "zod";

import {
  PERSON_LINK_TYPE_OPTIONS,
  TEMPLATE_TYPE_OPTIONS,
} from "@/lib/constants";

export const personSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required."),
  linkType: z.enum(PERSON_LINK_TYPE_OPTIONS),
  handleOrUrl: z.string().trim().optional(),
});

export const submissionSchema = z
  .object({
    templateType: z.enum(TEMPLATE_TYPE_OPTIONS),
    subspecialty: z.string().trim().optional(),
    residencyProgram: z.string().trim().optional(),
    customTitle: z.string().trim().optional(),
    sessionDate: z.string().min(1, "Session date is required."),
    chiefComplaint: z.string().trim().optional(),
    youtubeUrl: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    presenters: z
      .array(personSchema)
      .min(1, "At least one presenter is required."),
    discussants: z
      .array(personSchema)
      .min(1, "At least one discussant is required."),
  })
  .superRefine((value, ctx) => {
    if (
      value.templateType === "raphael_medina_subspecialty" &&
      !value.subspecialty
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Subspecialty is required for Raphael Medina submissions.",
        path: ["subspecialty"],
      });
    }

    if (value.templateType === "img_vmr" && !value.residencyProgram) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Residency program is required for IMG VMR submissions.",
        path: ["residencyProgram"],
      });
    }

    if (value.templateType === "custom" && !value.customTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom title is required for custom submissions.",
        path: ["customTitle"],
      });
    }

    if (value.youtubeUrl) {
      try {
        new URL(value.youtubeUrl);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "YouTube URL must be a valid URL.",
          path: ["youtubeUrl"],
        });
      }
    }
  });

export type PersonInput = z.infer<typeof personSchema>;

export type SubmissionFormInput = z.infer<typeof submissionSchema>;
