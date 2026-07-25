import React, { useEffect, useRef } from 'react'
import {EditorView, basicSetup} from "codemirror"
import {javascript} from "@codemirror/lang-javascript"
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { closeBrackets } from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { autoCloseTags } from "@codemirror/lang-html";
 
const Editor = () => {
  const editorRef = useRef(null);
  useEffect(() => {
    const view = new EditorView({
      doc: "console.log('hello')\n",
      extensions: [basicSetup, javascript(), vscodeDark, closeBrackets(), html(), autoCloseTags],
      parent: editorRef.current,
      theme: 'dracule',
    })
    return () => {
      view.destroy();
    }
  },[])
  return (
    <div ref={editorRef}></div>
  )
}

export default Editor
