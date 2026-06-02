
describe("Customers", () => {
    beforeEach(() => {
      cy.visit("/customers");
    });
  
    it("should display 10 customers", () => {
      cy.get('.card').should('have.length', 10);
    });

    it("should filter and display 10 customers", () => {
        cy.get('[name="filter"]').type('ze');
        cy.get('.card').should('have.length', 1);
    });

    it("should navigate to page 3", () => {
        cy.get('.pagination').contains('3').click();
        cy.get('.card').should('have.length', 2);
    });

    it("should display list view", () => {
        // Click List View
        cy.get('button[title="List View"]').click();
        cy.get('tr').should('have.length.gt', 5);
    });

    it("should display map view", () => {
        // Click Map View
        cy.get('button[title="Map View"]').click();
        cy.get('cm-map', { timeout: 10000 }).should('exist');
    });

    it("should click New Customer and navigate to login", () => {
        // Click New Customer
        cy.get('[data-cy="login-logout"]').click();
        cy.url().should('include', '/login');
    });

    
  });