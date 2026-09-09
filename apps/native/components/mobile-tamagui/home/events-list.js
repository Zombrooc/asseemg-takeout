"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsList = EventsList;
var event_card_1 = require("./event-card");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var react_native_1 = require("react-native");
function EventsList(_a) {
    var isLoading = _a.isLoading, events = _a.events, onOpenEvent = _a.onOpenEvent, onPair = _a.onPair;
    if (isLoading) {
        return (<react_native_1.View style={{
                paddingVertical: 48,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 160,
            }}>
        <ui_tamagui_1.Spinner size="large"/>
      </react_native_1.View>);
    }
    if (!events.length) {
        return (<ui_tamagui_1.EmptyState title="Nenhum evento disponível" description="Importe eventos no app desktop para que apareçam aqui." action={onPair ? (<ui_tamagui_1.Button onPress={onPair}>Parear com o Desktop</ui_tamagui_1.Button>) : undefined}/>);
    }
    return (<react_native_1.View style={{ gap: 12, flex: 1 }}>
      {events.map(function (event) { return (<event_card_1.EventCard key={event.eventId} event={event} onPress={onOpenEvent}/>); })}
    </react_native_1.View>);
}
