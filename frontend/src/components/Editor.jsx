import { useEffect, useRef } from 'react'
import {EditorView, basicSetup} from "codemirror"
import {cpp } from "@codemirror/lang-cpp"
import {javascript } from "@codemirror/lang-javascript"
import {python } from "@codemirror/lang-python"
import {java } from "@codemirror/lang-java"
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { closeBrackets } from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { autoCloseTags } from "@codemirror/lang-html";
import { indentWithTab } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import ACTIONS from '../action';


const template = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << \"Hello World\";\n    return 0;\n}",

  javascript: "console.log(\"Hello World\");",

  python: "print(\"Hello World\")",

  java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello World\");\n    }\n}"
};

const languageExtension = {
  cpp: cpp,
  javascript: javascript,
  python: python,
  java: java,
}

const Editor = ({socket, roomId, onCodeChange, username, language}) => {
  const editorContainerRef = useRef(null);
  const editorViewRef = useRef(null);
  const isRemoteChange = useRef(false);

  const handleSelectedLanguageExtension = () => {
    return languageExtension[language]();
  }

  useEffect(() => {
    const view = new EditorView({
      doc: onCodeChange(template[language]),
      extensions: [
        basicSetup,
        handleSelectedLanguageExtension(),
        keymap.of([indentWithTab]),
        vscodeDark, closeBrackets(), html(), autoCloseTags, EditorView.lineWrapping,

        EditorView.updateListener.of((update) => {
          if(!update.docChanged) return;
          if(isRemoteChange.current) return;

          const code = update.state.doc.toString();

          onCodeChange(code);
          
          if(socket){
            socket.emit(ACTIONS.CODE_CHANGE, {
              code,
              roomId
            })
          }

          // Emit for typing
          if(socket){
            socket.emit(ACTIONS.TYPING, {
              username,
              roomId
            })
          }
        })
      ],
      parent: editorContainerRef.current,
      theme: 'dracule',
    })
    editorViewRef.current = view;
    return () => {
      view.destroy();
    }
  },[language])

  useEffect(() => {
    const handleCodeChange = ({ code }) => {
      
      if( !editorViewRef.current || code == null) return;

      const currentCode = editorViewRef.current.state.doc.toString();

      

      if(currentCode == code) return;

      // We did this to prevent remote changes to prevent updateListener fires (we will stuck in a loop)
      // only local changes +input we send to server
      isRemoteChange.current = true;

      editorViewRef.current.dispatch({
        changes:{
          from: 0,
          to: editorViewRef.current.state.doc.length,
          insert: code,
        },
      });
      onCodeChange(code);
      isRemoteChange.current = false;
    }
    
    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
   
  },[socket, roomId])

  useEffect(() => {
      const view = editorViewRef.current;

      if (!view) return;

      const newCode = template[language] || "";

      isRemoteChange.current = true;

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: newCode,
        },
      });

      isRemoteChange.current = false;

      onCodeChange(newCode);

    }, [language]);

  return (
    <div ref={editorContainerRef}></div>
  )
}

export default Editor
