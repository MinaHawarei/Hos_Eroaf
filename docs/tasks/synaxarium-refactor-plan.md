# Synaxarium Refactor Plan

## Progress

- [x] Task 1 - Analyze current lectionary loading
- [x] Task 2 - Refactor backend service
- [x] Task 3 - Update controllers
- [x] Task 4 - Verify API response
- [x] Task 5 - Fix Dashboard search
- [x] Task 6 - Improve Arabic normalization
- [ ] Task 7 - Test Dashboard
- [ ] Task 8 - Test Presentation Mode
- [x] Task 9 - Regression Check
- [x] Task 10 - Remove obsolete code
- [x] Task 11 - Final verification

---

## Detailed Task Breakdown

### Task 1 - Analyze current lectionary loading
- **Files affected**: [ContentService.php](file:///d:/projects/Hos_Erof2/Hos_Erof/app/Services/ContentService.php)
- **Description**: Verify how files are loaded, check structure of `lectionary` files, verify locations of extracted `synaxarium` files.
- **Expected result**: Confirmed that `synaxarium` has been extracted to `storage/content/lectionary/synaxarium` containing 366 JSON files.
- **Status**: [x] Completed.

### Task 2 - Refactor backend service
- **Files affected**: [ContentService.php](file:///d:/projects/Hos_Erof2/Hos_Erof/app/Services/ContentService.php)
- **Description**:
  - Update `getByDayIndex` and `getLectionary` to load from `storage/content/lectionary` (excluding Synaxarium).
  - First inspect the loaded data structure to preserve backward compatibility. Inspect if a `synaxarium` key exists (whether as an array of strings or objects) and dynamically clear/unset it so the old in-file representations of Synaxarium are ignored.
  - Load Synaxarium from `storage/content/lectionary/synaxarium/{file}.json` separately.
  - Merge the Synaxarium content under the `synaxarium` key to preserve the exact API structure.
- **Expected result**: Unified method returning lectionary with Synaxarium correctly merged from the separate file.
- **Status**: [ ] Pending.

### Task 3 - Update controllers
- **Files affected**: [PresentationSearchService.php](file:///d:/projects/Hos_Erof2/Hos_Erof/app/Services/PresentationSearchService.php), [PresentationController.php](file:///d:/projects/Hos_Erof2/Hos_Erof/app/Http/Controllers/PresentationController.php)
- **Description**:
  - Add search scope handling to `PresentationSearchService` (`lectionary` vs `liturgy`).
  - When scope is `lectionary`, load/search from `storage/content/lectionary` (for normal lectionary readings) and load/search independently from `storage/content/lectionary/synaxarium` (for Synaxarium readings), and merge both collections before returning.
  - When scope is `liturgy`, search `storage/content/liturgy` only.
  - Update controller to read `type` parameter and query correct scope.
- **Expected result**: Separate endpoints/scopes for liturgy and lectionary searching without mixing.
- **Status**: [ ] Pending.

### Task 4 - Verify API response
- **Files affected**: None
- **Description**: Hit the `/presentation/search` endpoint with `type=lectionary` and `type=liturgy` parameters and verify that it returns correct data structures.
- **Expected result**: Clean API responses with expected keys and values.
- **Status**: [ ] Pending.

### Task 5 - Fix Dashboard search
- **Files affected**: [Dashboard.tsx](file:///d:/projects/Hos_Erof2/Hos_Erof/resources/js/pages/Dashboard.tsx), [SearchOverlay.tsx](file:///d:/projects/Hos_Erof2/Hos_Erof/resources/js/components/SearchOverlay.tsx)
- **Description**:
  - Bind "بحث" button to open `SearchOverlay`.
  - Add `searchType` prop to `SearchOverlay` to restrict to `lectionary`.
  - Reuse the existing routing/navigation mechanism of the Dashboard (e.g. Inertia's `router.visit`) to handle search result selection and navigate to the correct page `/presentation/lectionary/{dayKey}?season={season}`.
  - Keep `SearchOverlay` reusable without introducing any UI regression for PresentationPage.
- **Expected result**: Dashboard search opens, searches only lectionary, and redirects users to correct presentation page.
- **Status**: [ ] Pending.

### Task 6 - Improve Arabic normalization
- **Files affected**: [PresentationSearchService.php](file:///d:/projects/Hos_Erof2/Hos_Erof/app/Services/PresentationSearchService.php), [SearchService.ts](file:///d:/projects/Hos_Erof2/Hos_Erof/resources/js/services/SearchService.ts)
- **Description**:
  - Ignore Harakat (Tashkeel) and Tatweel (ـ).
  - Normalize Hamza variants (`أإآ` to `ا`, `ؤ` to `و`, `ئ` to `ي`).
  - Normalize `ى` → `ي`.
  - Normalize `ة` → `ه` (since the existing implementation already expects this).
  - Update frontend highlight regex parts to support `[وؤ]` and `[ييىئ]`.
- **Expected result**: Extremely user-friendly Arabic matching that ignores diacritics and hamza variations.
- **Status**: [ ] Pending.

### Task 7 - Test Dashboard
- **Files affected**: None
- **Description**: Manually test the Dashboard page to ensure searching and redirecting works smoothly.
- **Expected result**: Clean user experience with no console errors or crashes.
- **Status**: [ ] Pending.

### Task 8 - Test Presentation Mode
- **Files affected**: None
- **Description**: Manually test the Presentation Mode to verify search only searches liturgy files and inserts slides correctly.
- **Expected result**: Presentation search functionality is unbroken.
- **Status**: [ ] Pending.

### Task 9 - Regression Check
- **Files affected**: Whole codebase
- **Description**: Search the entire project for references to `synaxarium`, `storage/content/lectionary`, and `storage/content/lectionary/synaxarium` and verify no obsolete paths or assumptions remain after refactoring.
- **Expected result**: All references are clean and correct.
- **Status**: [ ] Pending.

### Task 10 - Remove obsolete code
- **Files affected**: Codebase audit
- **Description**: Ensure no leftover old Synaxarium loading code exists and remove any unused code.
- **Expected result**: Clean repository with no obsolete code or references.
- **Status**: [ ] Pending.

### Task 11 - Final verification
- **Files affected**: None
- **Description**: Run full TypeScript check and production build compilation.
- **Expected result**: Builds successfully with zero warnings/errors.
- **Status**: [ ] Pending.
