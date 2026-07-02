import { landingPageRescue } from './data/front-end/mission_1'

import { MissionGameplayEngine } from './MissionGameplayEngine'

export function MissionPage() {
  return <MissionGameplayEngine mission={landingPageRescue} />
}