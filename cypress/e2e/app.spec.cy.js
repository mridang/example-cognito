describe('NestJS Application Health Check', () => {
  it('should successfully invoke the /health endpoint', () => {
    cy.request('http://localhost:3000/health').then((response) => {
      expect(response.status).to.eq(200);
      // Add more assertions here based on your /health endpoint response structure
    });
  });
});
