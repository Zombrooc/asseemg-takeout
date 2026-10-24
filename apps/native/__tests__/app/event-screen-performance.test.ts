import { existsSync, readFileSync } from "fs";
import path from "path";

const screenPath = path.resolve(
	__dirname,
	"../../app/(drawer)/events/[eventId].tsx",
);

function loadScreen(): string {
	expect(existsSync(screenPath)).toBe(true);
	return readFileSync(screenPath, "utf-8");
}

describe("event screen confirmation performance", () => {
	it("keeps list props stable so an optimistic check-in does not rerender unchanged rows", () => {
		const source = loadScreen();

		expect(source).toContain(
			"const EMPTY_PARTICIPANT_ALERTS: ParticipantAlert[] = [];",
		);
		expect(source).toContain(
			"const PARTICIPANT_LIST_CONTENT_STYLE = { paddingVertical: 8 };",
		);
		expect(source).toContain("keyExtractor={participantKeyExtractor}");
		expect(source).toContain(
			"contentContainerStyle={PARTICIPANT_LIST_CONTENT_STYLE}",
		);
		expect(source).toContain("alerts={[...snapshot.alerts]}");
		expect(source).toContain("data={filteredParticipantIds}");
		expect(source).toContain("<ParticipantRow");
		expect(source).toContain("useParticipantEntity(entityKey)");
		expect(source).not.toContain("extraData={participantListExtraData}");
		expect(source).not.toContain("participants.find((p)");
	});

	it("does not keep closed edit and reservation modal trees mounted", () => {
		const editModal = readFileSync(
			path.resolve(
				__dirname,
				"../../components/mobile-tamagui/event/edit-participant-modal.tsx",
			),
			"utf-8",
		);
		const createModal = readFileSync(
			path.resolve(
				__dirname,
				"../../components/mobile-tamagui/event/legacy-create-participant-modal.tsx",
			),
			"utf-8",
		);

		expect(editModal).toContain("if (!visible) return null;");
		expect(createModal).toContain("if (!visible) return null;");
	});

	it("does not refetch the complete audit before closing a confirmed participant modal", () => {
		const source = loadScreen();
		const confirmedHandler = source.slice(
			source.indexOf("const handleConfirmed"),
			source.indexOf("const handleConflict"),
		);

		expect(confirmedHandler).toContain("setSelectedEntityKey(null);");
		expect(confirmedHandler).not.toContain("auditQuery.refetch()");
	});
});
