# Manual Testing Steps - Production Workflow
## Step-by-Step Testing Guide for Frontend

**Purpose**: Test the new production workflow where pre-treatment (padding) can start without design approval.

---

## 🎯 What We're Testing

### Business Requirement
> "Fabric can go to padding while design is being prepared. Only when BOTH padding AND design are completed, the fabric can move to printing."

### Key Changes
1. ✅ Pre-treatment can start WITHOUT design ready
2. ✅ Printing requires BOTH pre-treatment completed AND design ready
3. ✅ Clear error messages when blocked
4. ✅ Status cards show combined status

---

## 📋 Prerequisites

### Before You Start
- [ ] Database migration applied (check with `verify_migration.sql`)
- [ ] Frontend running (`npm start` in frontend folder)
- [ ] Browser DevTools open (F12) to check for errors
- [ ] Login credentials ready

---

## 🧪 Test Scenarios

### Test 1: Start Pre-treatment Without Design ✅ SHOULD SUCCEED

**Scenario**: Fabric received, no design yet, but want to start padding.

**Steps**:
1. Go to **Production** page
2. Find or create an order item with:
   - Design Status: "Design Pending"
   - Production Status: "Pending"
3. Click **"Update Production Status"** button
4. Select **"Pre-treatment"** from dropdown
5. Click **"Update"** or **"Save"**

**Expected Result**:
```
✅ Update succeeds
✅ Production Status changes to "Pre-treatment"
✅ Design Status remains "Design Pending"
✅ No error messages
✅ Item appears in "Padding in Progress, Design Pending" card
✅ Card shows orange/warning color
✅ Action button says "Follow up for design"
```

**If This Fails**:
- ❌ Error about design not ready = Migration not applied correctly
- ❌ Check database migration was executed

---

### Test 2: Block Printing Without Design ❌ SHOULD FAIL

**Scenario**: Padding completed, but design not approved yet.

**Steps**:
1. Use the same order item from Test 1 (now in pre-treatment)
2. Click **"Update Production Status"**
3. Try to select **"Printing"**
4. Click **"Update"**

**Expected Result**:
```
❌ Update fails
❌ Error message displayed:
   "BLOCKED: Cannot start printing without design approval.
    Design Status: Design Pending (Required: Design Ready)
    Action: Approve the design first, then start printing."
❌ Production Status remains "Pre-treatment"
✅ Error message is clear and helpful
✅ Status unchanged in database
```

**If This Succeeds (Unexpected)**:
- ❌ Migration not applied correctly
- ❌ Old validation logic still active
- ❌ DO NOT PROCEED - Fix migration first

---

### Test 3: Update Design to Received ✅ SHOULD SUCCEED

**Scenario**: Customer sends the design file.

**Steps**:
1. Same order item (pre-treatment, design pending)
2. Click **"Update Design Status"** button
3. Select **"Design Received from Customer"**
4. Optionally add:
   - Design File URL
   - Design Notes
5. Click **"Update"**

**Expected Result**:
```
✅ Update succeeds
✅ Design Status changes to "Design Received"
✅ Production Status remains "Pre-treatment"
✅ Item moves to "Padding Done, Design Under Review" card
✅ Card shows yellow/warning color
✅ Action: "Review and approve design"
```

---

### Test 4: Still Block Printing ❌ SHOULD STILL FAIL

**Scenario**: Design received but not yet approved for production.

**Steps**:
1. Same item (pre-treatment, design received)
2. Try to update Production Status to "Printing"

**Expected Result**:
```
❌ Still fails
❌ Error: Design not ready (current: Design Received)
✅ System correctly enforces approval step
```

---

### Test 5: Approve Design ✅ SHOULD SUCCEED

**Scenario**: Design team approves the design for production.

**Steps**:
1. Same item
2. Click **"Update Design Status"**
3. Select **"Design Ready"**
4. Click **"Update"**

**Expected Result**:
```
✅ Update succeeds
✅ Design Status changes to "Design Ready"
✅ Production Status still "Pre-treatment"
✅ Item moves to "✅ Ready for Printing" card
✅ Card shows GREEN color
✅ Priority indicator shows HIGH PRIORITY
✅ Action: "Start printing immediately"
✅ This is the CRITICAL STATE - both conditions met!
```

---

### Test 6: Now Printing Works ✅ SHOULD SUCCEED

**Scenario**: Both padding and design complete - ready for printing!

**Steps**:
1. Same item (pre-treatment, design ready)
2. Click **"Update Production Status"**
3. Select **"Printing"**
4. Click **"Update"**

**Expected Result**:
```
✅ Update succeeds!
✅ Production Status changes to "Printing"
✅ Item moves to "Printing in Progress" card
✅ Card shows blue/info color
✅ Timestamp recorded for printing start
✅ Both conditions were met, so printing allowed
```

---

### Test 7: Complete the Workflow ✅ ALL SHOULD SUCCEED

**Steps**:
1. Update Production Status to **"Post-processing"**
2. Verify it updates successfully
3. Update Production Status to **"Completed"**
4. Verify final state

**Expected Final State**:
```
✅ Design Status: "Design Ready"
✅ Production Status: "Completed"
✅ All stage timestamps populated
✅ Item ready for delivery challan
✅ Item appears in "Production Complete" section
```

---

### Test 8: Dashboard Metrics 📊

**Steps**:
1. Go to **Dashboard** or **Production** summary section
2. Look at status cards

**Expected Cards** (should show counts):
```
┌─────────────────────────────────────────┐
│ ⚠️ Padding Done, Waiting for Design    │
│ Count: X items                          │
│ Priority: HIGH (needs attention)        │
│ Color: Warning/Orange                   │
│ Action: "Approve designs"               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✅ Ready for Printing                   │
│ Count: X items                          │
│ Priority: HIGHEST (immediate action)    │
│ Color: Success/Green                    │
│ Action: "Start printing now"            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔄 Padding in Progress, Design Pending  │
│ Count: X items                          │
│ Priority: MEDIUM                        │
│ Color: Info/Blue                        │
│ Action: "Follow up for design"          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🖨️ Printing in Progress                 │
│ Count: X items                          │
│ Priority: MEDIUM                        │
│ Color: Info/Blue                        │
└─────────────────────────────────────────┘
```

---

### Test 9: Filters and Search 🔍

**Steps**:
1. Use filter dropdowns:
   - Filter by Design Status: "Design Pending"
   - Filter by Production Status: "Pre-treatment"
2. Verify only matching items show
3. Try other filter combinations
4. Test search by order number or customer name

**Expected**:
```
✅ Filters work correctly
✅ Search works
✅ Results update immediately
✅ No JavaScript errors in console
```

---

### Test 10: Edge Cases 🔍

**Test 10a: Try to Skip Pre-treatment**
- Start with: Pending/Design Ready
- Try to go directly to: Printing
- **Expected**: Should fail (must do pre-treatment first)

**Test 10b: Backwards Movement**
- From: Printing
- Try to go back to: Pre-treatment
- **Expected**: May fail or require confirmation

**Test 10c: Multiple Items Same Order**
- Create order with 2-3 items
- Put each in different stages
- Verify they track independently

---

## ✅ Test Results Checklist

After completing all tests, verify:

### Functional Requirements
- [ ] Can start pre-treatment without design
- [ ] Cannot start printing without design ready
- [ ] Cannot start printing without pre-treatment done
- [ ] Can start printing when both conditions met
- [ ] Clear error messages when blocked
- [ ] All status transitions work correctly

### UI/UX Requirements
- [ ] Status cards display correctly
- [ ] Colors match status (green=ready, orange=blocked, blue=active)
- [ ] Priority sorting works (ready for printing first)
- [ ] Blocking messages are clear and actionable
- [ ] Action buttons show correct next steps
- [ ] No JavaScript console errors

### Data Integrity
- [ ] Status updates save to database
- [ ] Timestamps recorded correctly
- [ ] Audit trail maintained
- [ ] No data corruption
- [ ] Concurrent updates handled

---

## 🐛 Common Issues and Solutions

### Issue 1: Pre-treatment Blocked by Design
**Symptom**: Error when trying to start pre-treatment
**Cause**: Migration not applied
**Solution**: Apply migration from `supabase/migrations/20251210120000_production_workflow_fix.sql`

### Issue 2: Printing Allowed Without Design
**Symptom**: Can start printing when design pending
**Cause**: Old validation still active
**Solution**: Check database trigger is updated

### Issue 3: Status Cards Not Showing
**Symptom**: Missing status summary cards
**Solution**: Check frontend code updated, clear browser cache

### Issue 4: Error Messages Not Clear
**Symptom**: Generic errors like "Update failed"
**Solution**: Check browser console for detailed error, may need frontend error handling update

---

## 📊 Test Results Template

Use this to document your results:

```
===========================================
MANUAL TESTING SESSION
===========================================
Date: ___________
Tester: ___________
Environment: Development / Staging / Production
Frontend Version: ___________

TEST RESULTS:
-------------
✅/❌ Test 1: Start Pre-treatment Without Design
✅/❌ Test 2: Block Printing Without Design
✅/❌ Test 3: Update Design to Received
✅/❌ Test 4: Still Block Printing
✅/❌ Test 5: Approve Design
✅/❌ Test 6: Now Printing Works
✅/❌ Test 7: Complete Workflow
✅/❌ Test 8: Dashboard Metrics
✅/❌ Test 9: Filters and Search
✅/❌ Test 10: Edge Cases

ISSUES FOUND:
-------------
1. [Description]
   Severity: Critical/High/Medium/Low
   Status: Open/Fixed

OVERALL RESULT:
--------------
[ ] PASS - Ready for production
[ ] FAIL - Issues found, need fixes

SIGN-OFF:
---------
Tested by: ___________
Date: ___________
Approved: YES / NO
```

---

## 🎯 Success Criteria

**System is working correctly when**:

✅ All 10 test scenarios pass
✅ Pre-treatment can start without design
✅ Printing is blocked until both ready
✅ Error messages are clear and helpful
✅ Status cards show correct information
✅ No console errors
✅ Performance is acceptable (< 2s)
✅ Data saves correctly to database

---

## 📞 Next Steps After Testing

1. **If All Tests Pass**:
   - Document results
   - Get approval
   - Deploy to production
   - Monitor for issues

2. **If Any Test Fails**:
   - Document the failure
   - Check database migration applied
   - Check frontend code deployed
   - Review error messages
   - Fix issues and retest

---

**Happy Testing!** 🚀
