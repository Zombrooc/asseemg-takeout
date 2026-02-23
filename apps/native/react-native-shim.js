/**
 * Shim para que imports de 'react-native' no app usem os componentes do Uniwind
 * (Text, View, Pressable, etc.) que processam className. Necessário para estilos Tailwind.
 */
module.exports = require("uniwind/components");
