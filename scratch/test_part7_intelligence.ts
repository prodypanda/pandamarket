import { analyticsService } from '../backend/src/services/analytics.service';
import { query } from '../backend/src/db/pool';

async function testPart7Intelligence() {
  console.log('--- Testing Part 7 Analytics Intelligence ---');

  // 1. Compute Daily Snapshots
  console.log('\n1. Computing Daily Intelligence Snapshots...');
  const snapshotRes = await analyticsService.computeDailyIntelligenceSnapshots();
  console.log('Snapshot Result:', snapshotRes);

  // 2. Anomaly Insights
  console.log('\n2. Testing Anomaly Insights...');
  const anomalies = await analyticsService.getAnomalyInsights({ timeRange: '30d' });
  console.log('Insight Count:', anomalies.insights.length);
  if (anomalies.insights.length > 0) {
    console.log('First Insight:', anomalies.insights[0]);
  }

  // 3. Vendor Risk Insights
  console.log('\n3. Testing Vendor Risk Insights...');
  const vendorRisk = await analyticsService.getVendorRiskInsights({ range: '30d' });
  console.log('Total At-Risk Vendors:', vendorRisk.vendors?.length || 0);
  if (vendorRisk.vendors?.length > 0) {
    console.log('First Vendor Risk:', vendorRisk.vendors[0]);
  }

  // 4. Churn Risk Insights
  console.log('\n4. Testing Churn Risk Insights...');
  const churnRisk = await analyticsService.getChurnRiskInsights({ range: '30d' });
  console.log('Total At-Risk Churn Vendors:', churnRisk.vendors?.length || 0);
  if (churnRisk.vendors?.length > 0) {
    console.log('First Churn Vendor:', churnRisk.vendors[0]);
  }

  // 5. Cohort Insights
  console.log('\n5. Testing Cohort Insights...');
  const cohorts = await analyticsService.getCohortInsights({ range: '12m', cohortType: 'seller_signup' });
  console.log('Cohort Count:', cohorts.cohorts?.length || 0);
  if (cohorts.cohorts?.length > 0) {
    console.log('First Cohort:', cohorts.cohorts[0]);
  }

  // 6. Report Schedules CRUD
  console.log('\n6. Testing Report Schedules CRUD...');
  const userRes = await query(`SELECT id FROM pd_user LIMIT 1`);
  const adminId = userRes.rows[0]?.id || 'usr_test_admin';
  const createdSchedule = await analyticsService.createReportSchedule(adminId, {
    name: 'Weekly Executive Briefing',
    frequency: 'weekly',
    recipients: ['admin@pandamarket.com'],
    format: 'csv',
  });
  console.log('Created Schedule:', createdSchedule.id);

  const fetchedSchedules = await analyticsService.getReportSchedules(adminId);
  console.log('Fetched Schedules Count:', fetchedSchedules.length);

  const updatedSchedule = await analyticsService.updateReportSchedule(adminId, createdSchedule.id, {
    frequency: 'monthly'
  });
  console.log('Updated Schedule Frequency:', updatedSchedule?.frequency);

  const deleted = await analyticsService.deleteReportSchedule(adminId, createdSchedule.id);
  console.log('Deleted Schedule:', deleted);

  console.log('\n--- Part 7 Analytics Intelligence Tests Passed! ---');
  process.exit(0);
}

testPart7Intelligence().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
