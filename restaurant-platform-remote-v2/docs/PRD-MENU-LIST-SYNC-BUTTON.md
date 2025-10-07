# Product Requirements Document: Menu List Sync Button

## Document Information
- **Document Version**: 1.0
- **Created**: 2025-10-05
- **Status**: APPROVED FOR IMPLEMENTATION
- **Priority**: CRITICAL - TOP PRIORITY

---

## Executive Summary

Add a dedicated sync button next to each menu name in the menu list page (`/menu/list`) to enable quick synchronization of menu configurations to selected delivery/ordering platforms.

---

## Problem Statement

### Current State
Users currently see platform-specific sync buttons in the actions section (far right) of each menu row, but they:
1. Are filtered to only show platforms included in `menu.channelIds`
2. Require users to scan right to find them
3. Are not immediately visible next to the menu name

### User Pain Point
The user explicitly requested: **"I JUST WANT A BUTTON TO GET ADDED NEXT TO THE MENU NAME TO SYNC"**

This indicates:
- Users need immediate visibility of sync capability
- Sync action should be prominently placed near the menu identifier
- Current placement is not meeting user workflow needs

---

## Proposed Solution

### Feature Overview
Add a **primary sync button** next to the menu name that triggers a multi-channel sync dialog, allowing users to:
1. Select which platforms to sync to
2. Trigger sync to multiple channels at once
3. See sync status in real-time
4. Receive success/error feedback

### User Experience Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Menu List Page                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  > [Menu Name] [🔄 Sync]  [Active]                         │
│    Description here...                                      │
│    12 products • Created 2d ago                             │
│                                                             │
│    User clicks [🔄 Sync] button →                          │
│                                                             │
│    ┌─────────────────────────────────────┐                │
│    │ Sync "Menu Name" to Platforms       │                │
│    ├─────────────────────────────────────┤                │
│    │ Select platforms to sync:           │                │
│    │ ☑ Careem                            │                │
│    │ ☑ Talabat                           │                │
│    │ ☐ Call Center                       │                │
│    │ ☐ Mobile App                        │                │
│    │                                      │                │
│    │ [Cancel]  [Sync Selected Platforms] │                │
│    └─────────────────────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

### 1. UI Component Placement

**Exact Location**: Line 494 in `/menu/list.tsx`
```typescript
// CURRENT CODE (Line 493-498):
<div className="flex items-center space-x-3">
  <h3 className="text-lg font-semibold text-gray-900 truncate">{menu.name}</h3>
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(menu.status)}`}>
    {menu.status}
  </span>
</div>

// PROPOSED CODE:
<div className="flex items-center space-x-3">
  <h3 className="text-lg font-semibold text-gray-900 truncate">{menu.name}</h3>

  {/* NEW: Primary Sync Button */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleOpenSyncModal(menu);
    }}
    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
    title="Sync menu to platforms"
  >
    <ArrowPathIcon className="w-3.5 h-3.5 mr-1" />
    Sync
  </button>

  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(menu.status)}`}>
    {menu.status}
  </span>
</div>
```

### 2. Sync Modal Component

**New Component**: Create `SyncMenuModal.tsx`

```typescript
interface SyncMenuModalProps {
  isOpen: boolean;
  menu: SavedMenu | null;
  platforms: Platform[];
  onClose: () => void;
  onSync: (menuId: string, selectedChannels: string[]) => Promise<void>;
}

export function SyncMenuModal({
  isOpen,
  menu,
  platforms,
  onClose,
  onSync
}: SyncMenuModalProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Pre-select platforms that are in menu.channelIds
  useEffect(() => {
    if (menu?.channelIds) {
      setSelectedChannels(menu.channelIds);
    }
  }, [menu]);

  const handleSync = async () => {
    if (!menu || selectedChannels.length === 0) return;

    setIsSyncing(true);
    try {
      await onSync(menu.id, selectedChannels);
      toast.success(`Menu synced to ${selectedChannels.length} platform(s)`);
      onClose();
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      {/* Modal implementation */}
    </Dialog>
  );
}
```

### 3. Backend API Endpoint

**Existing Endpoint**: `POST /api/v1/menu/saved-menus/:id/sync`

**Current Implementation**: Lines 203-236 in `saved-menus.controller.ts`

**Request Body**:
```json
{
  "channels": ["careem", "talabat", "callcenter"]
}
```

**Valid Channels**:
- `careem` - Careem Now delivery platform
- `talabat` - Talabat delivery platform
- `callcenter` - Internal call center system
- `mobile` - Mobile app ordering
- `online` - Web-based ordering

**Response**:
```json
{
  "success": true,
  "syncedChannels": ["careem", "talabat"],
  "results": {
    "careem": { "status": "success", "syncedProducts": 12 },
    "talabat": { "status": "success", "syncedProducts": 12 }
  },
  "lastSync": "2025-10-05T14:30:00Z"
}
```

---

## User Stories

### Primary User Story
**As a** restaurant manager
**I want** a prominent sync button next to each menu name
**So that** I can quickly sync menu changes to delivery platforms without scrolling

**Acceptance Criteria**:
- ✅ Sync button appears immediately next to menu name
- ✅ Button shows sync icon (ArrowPathIcon) and "Sync" label
- ✅ Clicking button opens platform selection modal
- ✅ Modal pre-selects platforms from menu.channelIds
- ✅ User can select/deselect platforms before syncing
- ✅ Sync executes to all selected platforms simultaneously
- ✅ Success/error toast notifications appear
- ✅ Last sync timestamp updates after successful sync

### Secondary User Stories

**Story 2: Multi-Platform Sync**
**As a** restaurant owner
**I want** to sync one menu to multiple platforms at once
**So that** I don't have to click multiple individual platform buttons

**Story 3: Visual Feedback**
**As a** branch manager
**I want** to see which platforms are syncing in real-time
**So that** I know the operation is in progress

**Story 4: Error Handling**
**As a** user
**I want** clear error messages if sync fails
**So that** I can troubleshoot or retry

---

## Functional Requirements

### FR-1: Button Visibility
- Button MUST appear on every menu row
- Button MUST be visible without horizontal scrolling
- Button MUST appear between menu name and status badge

### FR-2: Modal Behavior
- Modal MUST open on button click
- Modal MUST show all available platforms
- Modal MUST pre-select platforms from `menu.channelIds`
- Modal MUST allow selection/deselection of platforms
- Modal MUST prevent sync with no platforms selected

### FR-3: Sync Execution
- Sync MUST call backend endpoint: `POST /menu/saved-menus/:id/sync`
- Sync MUST send selected channel codes in request body
- Sync MUST handle multiple channels in single request
- Sync MUST update `menu.lastSync` timestamp on success

### FR-4: User Feedback
- Button MUST show loading state during sync (spinner icon)
- Success toast MUST appear with platform count
- Error toast MUST appear with specific error message
- Modal MUST close on successful sync
- Menu row MUST show updated "Synced Xm ago" timestamp

---

## Non-Functional Requirements

### NFR-1: Performance
- Modal MUST open within 200ms
- Sync request MUST complete within 10 seconds
- Button click MUST respond immediately (no lag)

### NFR-2: Accessibility
- Button MUST have descriptive `title` attribute
- Modal MUST be keyboard navigable (Tab, Esc)
- Screen readers MUST announce sync status

### NFR-3: Error Handling
- Network failures MUST show retry option
- Invalid channel errors MUST display specific message
- Concurrent sync attempts MUST be prevented (disable button)

### NFR-4: Security
- Sync endpoint MUST require authentication (JWT)
- Only authorized roles MUST access sync (company_owner, branch_manager)
- Company isolation MUST be enforced (can't sync other company's menus)

---

## UI/UX Specifications

### Button Design
```css
/* Primary Sync Button */
.sync-button {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem; /* px-2 py-1 */
  font-size: 0.75rem; /* text-xs */
  font-weight: 500; /* font-medium */
  color: #1d4ed8; /* text-blue-700 */
  background-color: #eff6ff; /* bg-blue-50 */
  border: 1px solid #bfdbfe; /* border-blue-200 */
  border-radius: 0.375rem; /* rounded-md */
  transition: background-color 0.15s;
}

.sync-button:hover {
  background-color: #dbeafe; /* hover:bg-blue-100 */
}

.sync-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Button States
1. **Default**: Blue background, sync icon, "Sync" text
2. **Hover**: Darker blue background
3. **Active/Syncing**: Spinner icon, "Syncing..." text, disabled
4. **Disabled**: Reduced opacity, no hover effect

### Modal Layout
```
┌──────────────────────────────────────────┐
│ Sync "Weekend Special Menu" to Platforms │ ← Menu name in title
├──────────────────────────────────────────┤
│                                          │
│ Select platforms to sync:                │
│                                          │
│ ☑ Careem            [Last sync: 5m ago] │ ← Shows last sync time
│ ☑ Talabat           [Last sync: 1h ago] │
│ ☐ Call Center       [Never synced]      │
│ ☐ Mobile App        [Synced 2d ago]     │
│ ☐ Online Ordering   [Never synced]      │
│                                          │
│ ⓘ This will push all 12 products to     │ ← Info message
│   selected platforms immediately.        │
│                                          │
├──────────────────────────────────────────┤
│                    [Cancel]  [Sync Now]  │ ← Action buttons
└──────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: UI Component (Day 1)
1. **Add sync button next to menu name** (30 min)
   - Modify line 494 in `/menu/list.tsx`
   - Add state for sync modal visibility
   - Add click handler

2. **Create SyncMenuModal component** (2 hours)
   - Platform selection checkboxes
   - Pre-selection logic based on `menu.channelIds`
   - Loading states
   - Form validation

3. **Integrate modal with sync logic** (1 hour)
   - Connect to existing `handleMenuSync` function
   - Modify to accept multiple channels
   - Update state management

### Phase 2: Backend Integration (Day 1-2)
4. **Update sync handler** (1 hour)
   - Modify `handleMenuSync` to support multi-channel
   - Use existing backend endpoint (already supports multiple channels)
   - Handle response and errors

5. **Add loading states** (30 min)
   - Show spinner in button during sync
   - Disable button during sync
   - Show progress in modal

### Phase 3: Testing & Polish (Day 2)
6. **Test sync functionality** (2 hours)
   - Single platform sync
   - Multi-platform sync
   - Error scenarios
   - Network failure handling

7. **UI polish** (1 hour)
   - Animations
   - Accessibility
   - Responsive design

### Phase 4: Documentation (Day 2)
8. **Update help documentation** (30 min)
   - Update help section in menu list page
   - Add tooltip explanations

---

## Success Metrics

### Quantitative Metrics
- **Sync button visibility**: 100% of menus show sync button
- **Sync success rate**: >95% of sync attempts succeed
- **Modal load time**: <200ms
- **Sync completion time**: <10s for multi-platform sync

### Qualitative Metrics
- **User satisfaction**: Sync button is easy to find and use
- **Workflow efficiency**: Reduced time to sync compared to current flow
- **Error clarity**: Users understand what went wrong if sync fails

---

## Edge Cases & Error Handling

### Edge Case 1: No Platforms Selected
**Scenario**: User clicks "Sync Now" with no platforms checked
**Behavior**: Show validation error "Please select at least one platform"
**Implementation**: Disable "Sync Now" button when `selectedChannels.length === 0`

### Edge Case 2: Menu Has No Products
**Scenario**: User tries to sync empty menu (0 products)
**Behavior**: Show warning "Cannot sync empty menu. Add products first."
**Implementation**: Check `menu.productCount` before opening modal

### Edge Case 3: Network Failure During Sync
**Scenario**: Network drops mid-sync
**Behavior**: Show error toast with retry button
**Implementation**: Catch network errors, keep modal open, enable retry

### Edge Case 4: Partial Sync Success
**Scenario**: Sync succeeds for Careem but fails for Talabat
**Behavior**: Show mixed result: "Synced to 1/2 platforms. Talabat failed: [reason]"
**Implementation**: Parse backend response, show detailed results

### Edge Case 5: Menu Not Found
**Scenario**: Menu deleted between page load and sync click
**Behavior**: Show error "Menu not found. Please refresh the page."
**Implementation**: Handle 404 response from backend

### Edge Case 6: Concurrent Sync Attempts
**Scenario**: User clicks sync button multiple times rapidly
**Behavior**: First click starts sync, subsequent clicks ignored until complete
**Implementation**: Disable button when `isSyncing === true`

---

## Technical Dependencies

### Frontend Dependencies
- **React**: 18.x (already in project)
- **Heroicons**: 24.x (ArrowPathIcon already imported)
- **react-hot-toast**: Already in use for notifications
- **Existing modal library**: Use project's modal pattern

### Backend Dependencies
- **Existing endpoint**: `POST /menu/saved-menus/:id/sync` (already implemented)
- **Valid channels**: careem, talabat, callcenter, mobile, online

### State Management
- **Local component state**: Use React hooks (useState)
- **No Redux needed**: Simple modal state management

---

## Risks & Mitigations

### Risk 1: Backend Sync Endpoint Limitations
**Risk**: Endpoint may not handle concurrent multi-channel syncs efficiently
**Mitigation**: Test with 5+ platforms, monitor backend logs for performance issues
**Fallback**: Sequential sync if parallel fails

### Risk 2: User Confusion with Two Sync Interfaces
**Risk**: Users may not understand difference between new button and existing platform buttons
**Mitigation**: Add tooltip explaining "Sync to multiple platforms at once"
**Future**: Consider hiding individual platform buttons when primary sync exists

### Risk 3: Modal Complexity for Non-Technical Users
**Risk**: Platform selection modal may be too technical
**Mitigation**: Add clear instructions, use friendly platform names
**Future**: Add "Sync to all" quick action button

---

## Future Enhancements (Out of Scope)

### Enhancement 1: Scheduled Sync
- Allow users to schedule automatic syncs (e.g., daily at 6 AM)
- Useful for menus that change frequently

### Enhancement 2: Sync History
- Show detailed sync history per platform
- Display success/failure logs
- Allow re-sync from history

### Enhancement 3: Bulk Sync
- Select multiple menus and sync all at once
- Useful for managing many menus

### Enhancement 4: Platform-Specific Sync Settings
- Different sync behavior per platform (e.g., include/exclude certain products)
- Advanced filtering per channel

---

## Acceptance Testing Checklist

### Visual Testing
- [ ] Sync button appears next to menu name on all menu rows
- [ ] Button has correct styling (blue theme, rounded, icon + text)
- [ ] Button hover effect works correctly
- [ ] Button maintains alignment with menu name and status badge

### Functional Testing
- [ ] Clicking sync button opens modal
- [ ] Modal shows all available platforms
- [ ] Platforms from `menu.channelIds` are pre-selected
- [ ] User can check/uncheck platforms
- [ ] "Sync Now" button is disabled when no platforms selected
- [ ] Clicking "Sync Now" triggers sync to all selected platforms
- [ ] Success toast appears after successful sync
- [ ] Error toast appears on sync failure
- [ ] Modal closes after successful sync
- [ ] Last sync timestamp updates in menu row

### Error Testing
- [ ] Sync with no platforms selected shows validation error
- [ ] Network failure shows clear error message
- [ ] Invalid channel shows backend error message
- [ ] Partial sync success shows mixed result message
- [ ] Concurrent sync attempts are prevented (button disabled)

### Performance Testing
- [ ] Modal opens within 200ms
- [ ] Sync to single platform completes within 5s
- [ ] Sync to 5 platforms completes within 10s
- [ ] No UI freezing during sync

### Accessibility Testing
- [ ] Button is keyboard accessible (Tab navigation)
- [ ] Modal is keyboard accessible (Tab, Esc to close)
- [ ] Screen reader announces button purpose
- [ ] Screen reader announces sync status changes

---

## Approval & Sign-Off

### Technical Review
- **Backend Review**: Confirm endpoint supports multi-channel sync ✅
- **Frontend Review**: Confirm component architecture ✅
- **UX Review**: Confirm user flow meets requirements ✅

### Stakeholder Approval
- **Product Owner**: [Pending]
- **Development Lead**: [Pending]
- **QA Lead**: [Pending]

---

## Appendix

### A. API Request/Response Examples

**Request**:
```bash
POST http://localhost:3001/api/v1/menu/saved-menus/550e8400-e29b-41d4-a716-446655440000/sync
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "channels": ["careem", "talabat"]
}
```

**Success Response**:
```json
{
  "success": true,
  "syncedChannels": ["careem", "talabat"],
  "results": {
    "careem": {
      "status": "success",
      "syncedProducts": 12,
      "timestamp": "2025-10-05T14:30:00Z"
    },
    "talabat": {
      "status": "success",
      "syncedProducts": 12,
      "timestamp": "2025-10-05T14:30:01Z"
    }
  },
  "lastSync": "2025-10-05T14:30:01Z"
}
```

**Error Response**:
```json
{
  "statusCode": 400,
  "message": "Invalid channel(s): invalid_channel. Valid channels: careem, talabat, callcenter, mobile, online",
  "error": "Bad Request"
}
```

### B. Component File Structure

```
frontend/
├── pages/
│   └── menu/
│       └── list.tsx (MODIFY: Add sync button at line 494)
├── src/
│   └── components/
│       └── menu/
│           └── SyncMenuModal.tsx (NEW: Create modal component)
```

### C. Related Documentation
- **Backend API**: `/backend/src/modules/menu/controllers/saved-menus.controller.ts:203-236`
- **Frontend Menu List**: `/frontend/pages/menu/list.tsx`
- **Sync Service**: `/backend/src/modules/menu/services/saved-menus.service.ts`

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-05 | Requirements Analyst | Initial PRD creation based on user requirement |

---

**END OF DOCUMENT**
