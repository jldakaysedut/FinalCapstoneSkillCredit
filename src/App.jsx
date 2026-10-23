import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 1. Import Layouts
import MainLayout from './layouts/MainLayout';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout'; 
import ModLayout from './layouts/ModLayout';
import SupportLayout from './layouts/SupportLayout';

// 2. Import Pages
import Home from './pages/public/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
// 🚨 IDINAGDAG: Forgot and Reset Password Pages
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import UserDashboard from './pages/user/UserDashboard';
import CreateSkill from './pages/user/CreateSkill';
import EditSkill from './pages/user/EditSkill'; 
import Messages from './pages/user/Messages';
import SkillDetails from './pages/user/SkillDetails';
import Sessions from './pages/user/Sessions';
import Profile from './pages/user/Profile';
import Leaderboard from './pages/user/Leaderboard';
import Notifications from './pages/user/Notifications';
import PublicProfile from './pages/user/PublicProfile';
import Community from './pages/user/Community';
import MyListings from './pages/user/MyListings';
import Payments from './pages/user/Payments';
import Settings from './pages/user/Settings';
import SetupInterests from './pages/user/SetupInterests';

// ADMIN PAGES
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import PlatformViewer from './pages/admin/PlatformViewer'; 
import AdminLogs from './pages/admin/AdminLogs'; 
import Escalations from './pages/admin/Escalations';

// MODERATOR PAGES
import ModDashboard from './pages/moderator/ModDashboard';
import Disputes from './pages/moderator/Disputes';             
import DisputeDetails from './pages/moderator/DisputeDetails'; 
import UserReports from './pages/moderator/UserReports';   
import ReportDetails from './pages/moderator/ReportDetails';
import ModLogs from './pages/moderator/ModLogs';
import RepeatOffenders from './pages/moderator/RepeatOffenders'; 
import SkillApprovals from './pages/moderator/SkillApprovals'; 
import SkillReview from './pages/moderator/SkillReview';       

// SUPPORT PAGES
import SupportDashboard from './pages/support/SupportDashboard';
import Tickets from './pages/support/Tickets';         
import TicketChat from './pages/support/TicketChat';   
import SupportLogs from './pages/support/SupportLogs'; 

export default function App() {
  return (
    <Router>
      <Routes>
        
        {/* PUBLIC ROUTES */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* AUTH ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* 🚨 IDINAGDAG: Auth Routes para sa password recovery */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        <Route path="/setup-interests" element={<SetupInterests />} /> 

        {/* USER ROUTES */}
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/create-skill" element={<CreateSkill />} />
          <Route path="/edit-skill/:id" element={<EditSkill />} /> 
          <Route path="/skill/:id" element={<SkillDetails />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/user/:id" element={<PublicProfile />} />
          <Route path="/community" element={<Community />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* ── SECURED ADMIN ROUTES ── */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/platform" element={<PlatformViewer />} />
          <Route path="/admin/logs" element={<AdminLogs />} /> 
          <Route path="/admin/escalations" element={<Escalations />} />
        </Route>

        {/* MODERATOR ROUTES */}
        <Route element={<ModLayout />}>
          <Route path="/moderator" element={<ModDashboard />} />
          <Route path="/moderator/approvals" element={<SkillApprovals />} />
          <Route path="/moderator/review/:id" element={<SkillReview />} />   
          <Route path="/moderator/disputes" element={<Disputes />} />               
          <Route path="/moderator/disputes/:id" element={<DisputeDetails />} />     
          <Route path="/moderator/reports" element={<UserReports />} />  
          <Route path="/moderator/reports/:id" element={<ReportDetails />} />
          <Route path="/moderator/logs" element={<ModLogs />} />  
          <Route path="/moderator/repeat-offenders" element={<RepeatOffenders />} />
        </Route>

        {/* SUPPORT ROUTES */}
        <Route element={<SupportLayout />}>
          <Route path="/support" element={<SupportDashboard />} />
          <Route path="/support/tickets" element={<Tickets />} />               
          <Route path="/support/tickets/:ticketId" element={<TicketChat />} />  
          <Route path="/support/logs" element={<SupportLogs />} /> 
        </Route>

      </Routes>
    </Router>
  );
}