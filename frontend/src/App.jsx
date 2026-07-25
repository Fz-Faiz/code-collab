import { Routes, Route } from "react-router-dom"
import {Toaster} from "react-hot-toast"
import  HomePage from "./pages/HomePage"
import EditorPage from "./pages/EditorPage"

function App(){
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage/>}></Route>
        <Route path="/editor/:roomId" element={<EditorPage/>}></Route>
      </Routes>
      <Toaster/>
    </>
  )
}

export default App