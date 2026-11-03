import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { closeBrackets } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { keymap } from "@codemirror/view";

const languageExtensions = {
  cpp: cpp,
  java: java,
  python: python,
  javascript: javascript,
};

const editorScrollTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13.5px",
  },
  ".cm-scroller": {
    overflow: "auto !important",
    fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
    scrollbarWidth: "thin",
    scrollbarColor: "#30363d #161b22",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller::-webkit-scrollbar": {
    width: "10px",
    height: "10px",
  },
  ".cm-scroller::-webkit-scrollbar-track": {
    backgroundColor: "#161b22",
  },
  ".cm-scroller::-webkit-scrollbar-thumb": {
    backgroundColor: "#30363d",
    borderRadius: "5px",
    border: "2px solid #161b22",
  },
  ".cm-scroller::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "#484f58",
  },
  ".cm-scroller::-webkit-scrollbar-corner": {
    backgroundColor: "#161b22",
  },
});

const StudentEditor = ({ value, onChange, language = "cpp", readOnly = false }) => {
  const editorContainerRef = useRef(null);
  const editorViewRef = useRef(null);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (!editorContainerRef.current) return;

    const langExt = languageExtensions[language]
      ? languageExtensions[language]()
      : cpp();

    const extensions = [
      basicSetup,
      langExt,
      keymap.of([indentWithTab]),
      vscodeDark,
      closeBrackets(),
      editorScrollTheme,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        if (isInternalChangeRef.current) return;

        const newCode = update.state.doc.toString();
        if (onChange) {
          onChange(newCode);
        }
      }),
    ];

    if (readOnly) {
      extensions.push(EditorView.editable.of(false));
    }

    const view = new EditorView({
      doc: value || "",
      extensions,
      parent: editorContainerRef.current,
    });

    editorViewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [language, readOnly]);

  // Sync external value changes (e.g. loading starter code or switching question)
  useEffect(() => {
    if (!editorViewRef.current) return;

    const currentDoc = editorViewRef.current.state.doc.toString();
    if (value !== undefined && value !== null && value !== currentDoc) {
      isInternalChangeRef.current = true;
      editorViewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
      isInternalChangeRef.current = false;
    }
  }, [value]);

  return (
    <div
      ref={editorContainerRef}
      className="w-full h-full min-h-0 flex-1 text-sm overflow-hidden rounded-xl border border-[#30363D] bg-[#1e1e1e]"
    />
  );
};

export default StudentEditor;
