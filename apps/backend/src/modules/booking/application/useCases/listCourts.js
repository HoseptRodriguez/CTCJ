/**
 * @param {{ courtRepository: import('../ports/CourtRepository.js').CourtRepository, clubId: string }} deps
 */
export function createListCourts({ courtRepository, clubId }) {
  return async function listCourts() {
    return courtRepository.listActive(clubId);
  };
}
