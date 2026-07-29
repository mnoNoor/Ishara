import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import SignRecorder from "./components/video/SignRecorder";
import Translate from "./components/video/Translate";

import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dictionary from "./pages/Dictionary";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="record" element={<SignRecorder />} />
          <Route path="translate" element={<Translate />} />
          <Route path="dictionary" element={<Dictionary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
