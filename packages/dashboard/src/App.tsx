import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Overview from './pages/Overview';
import Costs from './pages/Costs';
import AgentRuns from './pages/AgentRuns';
import AgentRunDetail from './pages/AgentRunDetail';
import Prompts from './pages/Prompts';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/agents" element={<AgentRuns />} />
        <Route path="/agents/:id" element={<AgentRunDetail />} />
        <Route path="/prompts" element={<Prompts />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
