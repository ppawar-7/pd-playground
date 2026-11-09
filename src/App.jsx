/**
 * App.jsx
 * ========
 * Root application component.
 * Defines all client-side routes using React Router v6.
 * Supports both Normal Gamified Progression and Unlocked Explore Everything Mode.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar.jsx';
import LandingPage from './pages/LandingPage/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage/DashboardPage.jsx';
import WorldMapPage from './pages/WorldMapPage/WorldMapPage.jsx';
import KingdomPage from './pages/KingdomPage/KingdomPage.jsx';
import LevelPage from './pages/LevelPage/LevelPage.jsx';
import ExplorePage from './pages/ExplorePage/ExplorePage.jsx';
import RTLStudioPage from './pages/StudioPage/RTLStudioPage.jsx';
import STAStudioPage from './pages/StudioPage/STAStudioPage.jsx';
import FloorplanStudioPage from './pages/FloorplanStudioPage/FloorplanStudioPage.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        {/* Landing page — no navbar */}
        <Route path="/" element={<LandingPage />} />

        {/* Main app routes — with persistent navbar */}
        <Route
          path="/*"
          element={
            <>
              <Navbar />
              <main className="page-content">
                <Routes>
                  {/* Normal Game Mode Routes */}
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/world-map" element={<WorldMapPage />} />
                  <Route path="/kingdom/:kingdomId" element={<KingdomPage />} />
                  <Route path="/kingdom/:kingdomId/level/:levelId" element={<LevelPage />} />
                  {/* Three-Studio Primary Studio Routes & Convenient Aliases */}
                  <Route path="/studio/rtl" element={<RTLStudioPage />} />
                  <Route path="/rtl-studio" element={<Navigate to="/studio/rtl" replace />} />
                  <Route path="/studio/floorplanning" element={<FloorplanStudioPage />} />
                  <Route path="/kingdom/floorplanning/studio" element={<FloorplanStudioPage />} />
                  <Route path="/floorplan-studio" element={<Navigate to="/studio/floorplanning" replace />} />
                  <Route path="/studio/sta" element={<STAStudioPage />} />
                  <Route path="/sta-studio" element={<Navigate to="/studio/sta" replace />} />

                  {/* Legacy Internal Mode for Maintainers */}
                  <Route path="/legacy/world-map" element={<WorldMapPage isLegacy={true} />} />

                  {/* Completely Separate Unlocked Explore Everything Mode Routes */}
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/explore/kingdom/:kingdomId" element={<KingdomPage isExploreMode={true} />} />
                  <Route path="/explore/kingdom/:kingdomId/level/:levelId" element={<LevelPage isExploreMode={true} />} />
                  <Route path="/explore/studio/rtl" element={<RTLStudioPage isExploreMode={true} />} />
                  <Route path="/explore/studio/sta" element={<STAStudioPage isExploreMode={true} />} />
                  <Route path="/explore/studio/floorplanning" element={<FloorplanStudioPage isExploreMode={true} />} />
                  <Route path="/explore/kingdom/floorplanning/studio" element={<FloorplanStudioPage isExploreMode={true} />} />

                  <Route path="/sanity-checks" element={<Navigate to="/world-map" replace />} />
                  <Route path="*" element={<Navigate to="/world-map" replace />} />
                </Routes>
              </main>
            </>
          }
        />
      </Routes>
    </div>
  );
}
