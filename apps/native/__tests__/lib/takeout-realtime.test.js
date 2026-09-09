"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var takeout_realtime_1 = require("@/lib/takeout-realtime");
describe("takeout realtime reconnect policy", function () {
    it("grows reconnect delay using backoff", function () {
        expect((0, takeout_realtime_1.nextReconnectDelay)(takeout_realtime_1.realtimeConfig.INITIAL_RECONNECT_DELAY_MS)).toBeGreaterThan(takeout_realtime_1.realtimeConfig.INITIAL_RECONNECT_DELAY_MS);
    });
    it("caps reconnect delay at max", function () {
        expect((0, takeout_realtime_1.nextReconnectDelay)(takeout_realtime_1.realtimeConfig.MAX_RECONNECT_DELAY_MS)).toBe(takeout_realtime_1.realtimeConfig.MAX_RECONNECT_DELAY_MS);
        expect((0, takeout_realtime_1.nextReconnectDelay)(takeout_realtime_1.realtimeConfig.MAX_RECONNECT_DELAY_MS * 2)).toBe(takeout_realtime_1.realtimeConfig.MAX_RECONNECT_DELAY_MS);
    });
});
describe("realtime invalidation policy", function () {
    it("invalidates participants and audit for participant_checked_in", function () {
        expect((0, takeout_realtime_1.getRealtimeInvalidation)({
            type: "participant_checked_in",
            ticket_id: "seat-1",
        })).toEqual({
            invalidateParticipants: true,
            invalidateAudit: true,
            invalidateEvents: false,
        });
    });
    it("invalidates participants and audit for participant_checkin_reverted", function () {
        expect((0, takeout_realtime_1.getRealtimeInvalidation)({
            type: "participant_checkin_reverted",
            ticket_id: "seat-1",
        })).toEqual({
            invalidateParticipants: true,
            invalidateAudit: true,
            invalidateEvents: false,
        });
    });
    it("invalidates only participants for participant_updated", function () {
        expect((0, takeout_realtime_1.getRealtimeInvalidation)({
            type: "participant_updated",
            participant_id: "seat-1",
        })).toEqual({
            invalidateParticipants: true,
            invalidateAudit: false,
            invalidateEvents: false,
        });
    });
    it("invalidates events list for events_list_changed", function () {
        expect((0, takeout_realtime_1.getRealtimeInvalidation)({ type: "events_list_changed" })).toEqual({
            invalidateParticipants: false,
            invalidateAudit: false,
            invalidateEvents: true,
        });
    });
});
describe("realtime message parser", function () {
    it("parses string payload", function () {
        expect((0, takeout_realtime_1.parseRealtimeMessageData)(JSON.stringify({
            type: "participant_updated",
            participant_id: "seat-1",
        }))).toEqual({
            type: "participant_updated",
            participant_id: "seat-1",
        });
    });
    it("accepts object payload", function () {
        expect((0, takeout_realtime_1.parseRealtimeMessageData)({
            type: "participant_updated",
            participant_id: "seat-2",
        })).toEqual({
            type: "participant_updated",
            participant_id: "seat-2",
        });
    });
    it("returns null for invalid payload", function () {
        expect((0, takeout_realtime_1.parseRealtimeMessageData)("not-json")).toBeNull();
        expect((0, takeout_realtime_1.parseRealtimeMessageData)(42)).toBeNull();
        expect((0, takeout_realtime_1.parseRealtimeMessageData)({ nope: true })).toBeNull();
    });
});
