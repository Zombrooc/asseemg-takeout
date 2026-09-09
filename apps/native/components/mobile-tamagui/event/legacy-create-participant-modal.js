"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyCreateParticipantModal = LegacyCreateParticipantModal;
var ui_tamagui_1 = require("@/components/ui-tamagui");
var react_1 = require("react");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var MIN_DATE = "1900-01-01";
function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    var parsed = new Date("".concat(value, "T00:00:00Z"));
    if (Number.isNaN(parsed.getTime()))
        return false;
    var iso = parsed.toISOString().slice(0, 10);
    return iso === value && value >= MIN_DATE;
}
function LegacyCreateParticipantModal(_a) {
    var visible = _a.visible, reservations = _a.reservations, submitting = _a.submitting, onClose = _a.onClose, onSubmit = _a.onSubmit;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var _b = (0, react_1.useState)(null), reservationId = _b[0], setReservationId = _b[1];
    var _c = (0, react_1.useState)(""), name = _c[0], setName = _c[1];
    var _d = (0, react_1.useState)(""), cpf = _d[0], setCpf = _d[1];
    var _e = (0, react_1.useState)(""), birthDate = _e[0], setBirthDate = _e[1];
    var _f = (0, react_1.useState)(""), ticketType = _f[0], setTicketType = _f[1];
    var _g = (0, react_1.useState)(""), shirtSize = _g[0], setShirtSize = _g[1];
    var _h = (0, react_1.useState)(""), team = _h[0], setTeam = _h[1];
    var _j = (0, react_1.useState)(""), sex = _j[0], setSex = _j[1];
    var _k = (0, react_1.useState)(null), error = _k[0], setError = _k[1];
    (0, react_1.useEffect)(function () {
        var _a, _b;
        if (!visible)
            return;
        setReservationId((_b = (_a = reservations[0]) === null || _a === void 0 ? void 0 : _a.bibNumber) !== null && _b !== void 0 ? _b : null);
        setName("");
        setCpf("");
        setBirthDate("");
        setTicketType("");
        setShirtSize("");
        setTeam("");
        setSex("");
        setError(null);
    }, [visible, reservations]);
    var handleSubmit = function () {
        if (reservationId == null) {
            setError("Selecione um número reservado.");
            return;
        }
        if (!name.trim()) {
            setError("Nome é obrigatório.");
            return;
        }
        if (!cpf.trim()) {
            setError("CPF é obrigatório.");
            return;
        }
        if (!isValidDate(birthDate.trim())) {
            setError("Data de nascimento inválida (AAAA-MM-DD).");
            return;
        }
        if (!ticketType.trim()) {
            setError("Tipo de ingresso é obrigatório.");
            return;
        }
        setError(null);
        onSubmit({
            reservationId: reservationId,
            name: name.trim(),
            cpf: cpf.trim(),
            birthDate: birthDate.trim(),
            ticketType: ticketType.trim(),
            shirtSize: shirtSize.trim() ? shirtSize.trim() : null,
            team: team.trim() ? team.trim() : null,
            sex: sex.trim() ? sex.trim() : null,
        });
    };
    return (<react_native_1.Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <react_native_1.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", padding: 16, justifyContent: "center" }}>
        <react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === "ios" ? "padding" : undefined}>
          <ui_tamagui_1.Card style={{ padding: 16, maxHeight: "90%" }}>
            <react_native_1.Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
              Cadastrar participante (reserva)
            </react_native_1.Text>

            <react_native_1.Text style={{ fontSize: 14, marginBottom: 8 }}>Número reservado</react_native_1.Text>
            {reservations.length === 0 ? (<react_native_1.Text style={{ color: "#6b7280", marginBottom: 12 }}>
                Nenhuma reserva disponível.
              </react_native_1.Text>) : (<react_native_1.View style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 8,
                maxHeight: 140,
                marginBottom: 12,
            }}>
                <react_native_1.ScrollView>
                  {reservations.map(function (item) {
                var selected = reservationId === item.bibNumber;
                return (<react_native_1.Pressable key={item.bibNumber} onPress={function () { return setReservationId(item.bibNumber); }} style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        backgroundColor: selected ? "#eef2ff" : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: "#f3f4f6",
                    }}>
                        <react_native_1.Text style={{ fontSize: 14 }}>
                          #{item.bibNumber} {item.label ? "\u2014 ".concat(item.label) : ""}
                        </react_native_1.Text>
                      </react_native_1.Pressable>);
            })}
                </react_native_1.ScrollView>
              </react_native_1.View>)}

            <react_native_1.ScrollView style={{ marginBottom: 12 }}>
              <react_native_1.Text style={{ fontSize: 14, marginBottom: 6 }}>Nome</react_native_1.Text>
              <ui_tamagui_1.Input value={name} onChangeText={setName} placeholder="Nome do participante"/>

              <react_native_1.Text style={{ fontSize: 14, marginVertical: 6 }}>CPF</react_native_1.Text>
              <ui_tamagui_1.Input value={cpf} onChangeText={setCpf} placeholder="CPF"/>

              <react_native_1.Text style={{ fontSize: 14, marginVertical: 6 }}>Data de nascimento</react_native_1.Text>
              <ui_tamagui_1.Input value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-DD"/>

              <react_native_1.Text style={{ fontSize: 14, marginVertical: 6 }}>Tipo de ingresso</react_native_1.Text>
              <ui_tamagui_1.Input value={ticketType} onChangeText={setTicketType} placeholder="Ex.: 5KM"/>

              <react_native_1.Text style={{ fontSize: 14, marginVertical: 6 }}>Tamanho da camisa</react_native_1.Text>
              <ui_tamagui_1.Input value={shirtSize} onChangeText={setShirtSize} placeholder="Ex.: P, M, G"/>

              <react_native_1.Text style={{ fontSize: 14, marginVertical: 6 }}>Equipe</react_native_1.Text>
              <ui_tamagui_1.Input value={team} onChangeText={setTeam} placeholder="Nome da equipe"/>

              <react_native_1.Text style={{ fontSize: 14, marginVertical: 6 }}>Sexo (opcional)</react_native_1.Text>
              <ui_tamagui_1.Input value={sex} onChangeText={setSex} placeholder="Ex.: Feminino"/>
            </react_native_1.ScrollView>

            {error ? (<react_native_1.Text style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</react_native_1.Text>) : null}

            <react_native_1.View style={{ flexDirection: "row", gap: 8, paddingBottom: insets.bottom }}>
              <ui_tamagui_1.Button variant="bordered" onPress={onClose} isDisabled={submitting}>
                Cancelar
              </ui_tamagui_1.Button>
              <ui_tamagui_1.Button onPress={handleSubmit} isDisabled={submitting || reservations.length === 0} loading={submitting}>
                {submitting ? "Salvando" : "Cadastrar"}
              </ui_tamagui_1.Button>
            </react_native_1.View>
          </ui_tamagui_1.Card>
        </react_native_1.KeyboardAvoidingView>
      </react_native_1.View>
    </react_native_1.Modal>);
}
