import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { HomePage } from '../pages/home.page';
import { PatientChartPage } from '../pages/patient-chart.page';

test('Mark patient as deceased', async ({ page, api }) => {
  const patient = await api.patient.createPatient({
    person: {
      names: [{ givenName: 'Test', familyName: 'Deceased' }],
      gender: 'M',
      birthdate: '1980-01-01'
    },
    identifiers: [{ 
      identifierType: process.env.IDENTIFIER_TYPE_UUID, 
      location: process.env.LOCATION_UUID 
    }]
  });

  const patientIdentifier = patient.identifiers[0].display.split('=')[1].trim();
  const firstName = patient.person.display.split(' ')[0];

  const loginPage = new LoginPage(page);
  await loginPage.login(process.env.E2E_USERNAME, process.env.E2E_PASSWORD);

  const homePage = new HomePage(page);
  await homePage.searchPatient(patientIdentifier);
  await homePage.selectPatient(firstName);

  const patientChartPage = new PatientChartPage(page);

  await test.step('Open patient actions', async () => {
    await patientChartPage.openActionsMenu();
  });

  await test.step('Select mark as deceased', async () => {
    await patientChartPage.selectMarkAsDeceased();
  });

  await test.step('Fill death details', async () => {
    await patientChartPage.enterDateOfDeath(new Date());
    await patientChartPage.enterCauseOfDeath('Neoplasm');
    await patientChartPage.saveDeathDetails();
  });

  await test.step('Verify deceased status', async () => {
    await expect(patientChartPage.deceasedTag).toBeVisible();
    
    const updatedPatient = await api.patient.getPatient(patientIdentifier);
    expect(updatedPatient.dead).toBe(true);
    expect(updatedPatient.deathDate).not.toBeNull();
  });
});
