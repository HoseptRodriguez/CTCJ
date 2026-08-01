import { Academy } from './sections/Academy.jsx';
import { Club } from './sections/Club.jsx';
import { Coaches } from './sections/Coaches.jsx';
import { Competition } from './sections/Competition.jsx';
import { Experience } from './sections/Experience.jsx';
import { Facilities } from './sections/Facilities.jsx';
import { FinalCta } from './sections/FinalCta.jsx';
import { Hero } from './sections/Hero.jsx';
import { MyCtcjPreview } from './sections/MyCtcjPreview.jsx';
import { NewsAndEvents } from './sections/NewsAndEvents.jsx';
import { ParentsAndFamilies } from './sections/ParentsAndFamilies.jsx';
import { PlayerDevelopment } from './sections/PlayerDevelopment.jsx';
import { Ranking } from './sections/Ranking.jsx';
import { ReservationPreview } from './sections/ReservationPreview.jsx';
import { RoadToMasters } from './sections/RoadToMasters.jsx';

export function HomePage() {
  return (
    <>
      <Hero />
      <Club />
      <Experience />
      <Academy />
      <Coaches />
      <Facilities />
      <ReservationPreview />
      <Competition />
      <Ranking />
      <RoadToMasters />
      <PlayerDevelopment />
      <MyCtcjPreview />
      <ParentsAndFamilies />
      <NewsAndEvents />
      <FinalCta />
    </>
  );
}
