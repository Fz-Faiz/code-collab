import { useEffect, useRef } from 'react'
import {EditorView, basicSetup} from "codemirror"
import {javascript} from "@codemirror/lang-javascript"
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { closeBrackets } from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { autoCloseTags } from "@codemirror/lang-html";
import ACTIONS from '../action';
 
const Editor = ({socket, roomId, onCodeChange}) => {
  const editorContainerRef = useRef(null);
  const editorViewRef = useRef(null);
  const isRemoteChange = useRef(false);

  useEffect(() => {
    const view = new EditorView({
      doc: "",
      extensions: [
        basicSetup, 
        javascript({
          jsx: true,
        }), 
        vscodeDark, closeBrackets(), html(), autoCloseTags,
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
        })
      ],
      parent: editorContainerRef.current,
      theme: 'dracule',
    })
    editorViewRef.current = view;
    return () => {
      view.destroy();
    }
  },[])
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
          to: currentCode.length,
          insert: code,
        },
      });

      isRemoteChange.current = false;
    }
    
    socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
   
  },[socket, roomId])

  return (
    <div ref={editorContainerRef}></div>
  )
}

export default Editor
