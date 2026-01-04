
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Bluloco Light Palette Approximation
const colors = {
  background: '#FAFAFA',
  foreground: '#383A42',
  selection: '#BBDFFF',
  cursor: '#FF0000',
  lineHighlight: '#F0F0F0',
  
  keyword: '#0054CF',        // var, function, return, if (Blue)
  atom: '#D52753',           // constants, booleans (Pink/Red)
  number: '#986801',         // numbers (Orange/Brown)
  definition: '#D52753',     // class names, definitions (Pink)
  variable: '#383A42',       // variable names (Dark Grey)
  string: '#C5A332',         // strings (Gold/Mustard)
  comment: '#A0A1A7',        // comments (Grey)
  operator: '#0098DD',       // operators (Cyan)
  property: '#005CC5',       // properties, functions
  tag: '#22863A',            // xml tags
  attribute: '#6F42C1',      // xml attributes
};

const blulocoLightTheme = EditorView.theme({
  "&": {
    color: colors.foreground,
    backgroundColor: colors.background
  },
  ".cm-content": {
    caretColor: colors.cursor
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: colors.cursor
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: colors.selection
  },
  ".cm-activeLine": {
    backgroundColor: colors.lineHighlight
  },
  ".cm-gutters": {
    backgroundColor: colors.background,
    color: "#A0A1A7",
    borderRight: "1px solid #E1E4E8"
  },
  ".cm-activeLineGutter": {
    backgroundColor: colors.lineHighlight
  }
}, { dark: false });

const blulocoLightHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: colors.keyword, fontWeight: "bold" },
  { tag: [t.name, t.deleted, t.character, t.macroName], color: colors.variable },
  { tag: [t.propertyName], color: colors.property },
  { tag: [t.processingInstruction, t.string, t.inserted, t.special(t.string)], color: colors.string },
  { tag: [t.function(t.variableName), t.labelName], color: colors.property },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: colors.atom },
  { tag: [t.definition(t.name), t.separator], color: colors.definition },
  { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: colors.definition },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link], color: colors.operator },
  { tag: [t.meta, t.comment], color: colors.comment, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.link, color: colors.keyword, textDecoration: "underline" },
  { tag: t.heading, fontWeight: "bold", color: colors.keyword },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: colors.atom },
  
  // XML/HTML specific
  { tag: t.tagName, color: colors.tag },
  { tag: t.attributeName, color: colors.attribute },
]);

export const blulocoLight: Extension = [
  blulocoLightTheme,
  syntaxHighlighting(blulocoLightHighlightStyle)
];
