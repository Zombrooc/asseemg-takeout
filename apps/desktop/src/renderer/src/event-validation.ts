import { z } from "zod";

export const eventMetadataSchema = z.object({
	name: z.string().trim().min(1, "Informe o nome do evento."),
	startDate: z.string().trim().min(1, "Informe a data inicial."),
});

export type EventMetadataField = keyof z.infer<typeof eventMetadataSchema>;
export type EventMetadataErrors = Partial<Record<EventMetadataField, string>>;

export function getEventMetadataErrors(
	values: z.input<typeof eventMetadataSchema>,
): EventMetadataErrors {
	const result = eventMetadataSchema.safeParse(values);
	if (result.success) return {};

	return result.error.issues.reduce<EventMetadataErrors>((errors, issue) => {
		const field = issue.path[0];
		if ((field === "name" || field === "startDate") && !errors[field]) {
			errors[field] = issue.message;
		}
		return errors;
	}, {});
}
