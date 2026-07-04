import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import StudyDesign from './pages/StudyDesign'
import Hypotheses from './pages/Hypotheses'
import InterviewProtocol from './pages/InterviewProtocol'
import Codebook from './pages/Codebook'
import PersonaBuilder from './pages/PersonaBuilder'
import PersonaLibrary from './pages/PersonaLibrary'
import RunInterviews from './pages/RunInterviews'
import Transcripts from './pages/Transcripts'
import Coding from './pages/Coding'
import Reliability from './pages/Reliability'
import PatternMatching from './pages/PatternMatching'
import JointDisplay from './pages/JointDisplay'
import PilotReport from './pages/PilotReport'
import ExportCentre from './pages/ExportCentre'
import Settings from './pages/Settings'
import AICalibration from './pages/AICalibration'
import ChangeLog from './pages/ChangeLog'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/design/study" element={<StudyDesign />} />
          <Route path="/design/hypotheses" element={<Hypotheses />} />
          <Route path="/design/protocol" element={<InterviewProtocol />} />
          <Route path="/design/codebook" element={<Codebook />} />
          <Route path="/participants/builder" element={<PersonaBuilder />} />
          <Route path="/participants/library" element={<PersonaLibrary />} />
          <Route path="/fieldwork/run" element={<RunInterviews />} />
          <Route path="/fieldwork/transcripts" element={<Transcripts />} />
          <Route path="/analysis/coding" element={<Coding />} />
          <Route path="/analysis/reliability" element={<Reliability />} />
          <Route path="/analysis/patterns" element={<PatternMatching />} />
          <Route path="/analysis/joint-display" element={<JointDisplay />} />
          <Route path="/outputs/report" element={<PilotReport />} />
          <Route path="/outputs/export" element={<ExportCentre />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/calibration" element={<AICalibration />} />
          <Route path="/settings/changelog" element={<ChangeLog />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
