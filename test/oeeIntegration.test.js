describe("OEE Integration Test", function() {
    let chai;
    let expect;
    let OEECalculator;

    before(async function() {
        chai = await
        import ("chai");
        expect = chai.expect;
        OEECalculator = (await
            import ("../src/oeeCalculator.js")).OEECalculator; // Ensure the correct path
    });

    let calculator;

    beforeEach(async function() {
        calculator = new OEECalculator();
        await calculator.init("1");
    });

    it("should correctly update and process metrics for a machine", async function() {
        const machineId = "1";
        calculator.updateData("Runtime", 210, machineId);
        calculator.updateData("targetPerformance", 1000, machineId);
        calculator.updateData("ActualProductionYield", 950, machineId);

        await calculator.calculateMetrics(machineId, 0, 0);

        const metrics = calculator.getMetrics(machineId);
        expect(metrics.oee).to.be.within(0, 100);
        expect(metrics.availability).to.be.within(0, 1);
        expect(metrics.performance).to.be.within(0, 1);
        expect(metrics.quality).to.be.within(0, 1);
    });
});