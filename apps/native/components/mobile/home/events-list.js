"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsList = EventsList;
var heroui_native_1 = require("heroui-native");
var event_card_1 = require("@/components/mobile/home/event-card");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function EventsList(_a) {
    var isLoading = _a.isLoading, events = _a.events, onOpenEvent = _a.onOpenEvent, onPair = _a.onPair;
    if (isLoading) {
        return (<primitives_1.View className="py-12 items-center justify-center min-h-[160px]">
        <heroui_native_1.Spinner size="lg"/>
      </primitives_1.View>);
    }
    if (!events.length) {
        return (<ui_1.EmptyState title="Nenhum evento disponível" description="Importe eventos no app desktop para que apareçam aqui." cta={onPair
                ? { label: "Parear com o Desktop", onPress: onPair }
                : undefined}/>);
    }
    return (<primitives_1.View className="gap-3 flex-1">
      {events.map(function (event) { return (<event_card_1.EventCard key={event.eventId} event={event} onPress={onOpenEvent}/>); })}
    </primitives_1.View>);
}
