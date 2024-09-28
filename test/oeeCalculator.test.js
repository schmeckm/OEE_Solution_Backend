let chai;
let expect;
let sinon;
let OEECalculator;

before(async() => {
    chai = await
    import ("chai");
    expect = chai.expect;
    sinon = await
    import ("sinon");
    OEECalculator = require("../src/oeeCalculator").OEECalculator;
});

describe("OEECalculator", function() {
    let calculator;

    beforeEach(async function() {
        calculator = new OEECalculator();
        sinon.stub(calculator, "init").callsFake(async(machineId) => {
            // Simulate initialization with mock data for multiple machines
            if (machineId === "1") {
                calculator.oeeData[machineId] = {
                    ProcessOrderNumber: "47111",
                    MaterialNumber: "1019292",
                    MaterialDescription: "Super Medicine",
                    plannedProductionQuantity: 210,
                    Runtime: 210,
                    actualPerformance: 0,
                    targetPerformance: 1000,
                    ActualProductionYield: 950,
                    ActualProductionQuantity: 1000,
                    unplannedDowntime: 600,
                    setupTime: 60,
                    processingTime: 120,
                    teardownTime: 30,
                    availability: 0,
                    performance: 0,
                    quality: 0,
                    oee: 0,
                    StartTime: "2024-07-14T06:15:13+02:00",
                    EndTime: "2024-07-14T22:15:18+02:00",
                };
            } else if (machineId === "2") {
                calculator.oeeData[machineId] = {
                    ProcessOrderNumber: "47112",
                    MaterialNumber: "1019293",
                    MaterialDescription: "Another Medicine",
                    plannedProductionQuantity: 155,
                    Runtime: 155,
                    actualPerformance: 0,
                    targetPerformance: 800,
                    ActualProductionYield: 780,
                    ActualProductionQuantity: 800,
                    unplannedDowntime: 400,
                    setupTime: 45,
                    processingTime: 90,
                    teardownTime: 20,
                    availability: 0,
                    performance: 0,
                    quality: 0,
                    oee: 0,
                    StartTime: "2024-07-15T06:15:13+02:00",
                    EndTime: "2024-07-15T22:15:18+02:00",
                };
            }
        });
    });

    afterEach(function() {
        sinon.restore(); // Restore original functionality after each test
    });

    it("should initialize with correct process order data for multiple machines", async function() {
        const machineId1 = "1";
        const machineId2 = "2";

        await calculator.init(machineId1);
        await calculator.init(machineId2);

        expect(calculator.oeeData[machineId1]).to.have.property(
            "ProcessOrderNumber"
        ).that.is.not.null;
        expect(calculator.oeeData[machineId2]).to.have.property(
            "ProcessOrderNumber"
        ).that.is.not.null;
    });

    it("should update metrics correctly for multiple machines", function() {
        const machineId1 = "1";
        const machineId2 = "2";
        const metric = "plannedProductionQuantity";

        calculator.updateData(metric, 200, machineId1);
        calculator.updateData(metric, 160, machineId2);

        expect(calculator.oeeData[machineId1][metric]).to.equal(200);
        expect(calculator.oeeData[machineId2][metric]).to.equal(160);
    });

    it("should calculate OEE correctly based on metrics for multiple machines", async function() {
        const machineId1 = "1";
        const machineId2 = "2";

        await calculator.init(machineId1);
        await calculator.init(machineId2);

        await calculator.calculateMetrics(machineId1, 0, 0);
        await calculator.calculateMetrics(machineId2, 0, 0);

        expect(calculator.oeeData[machineId1].oee).to.be.greaterThan(0);
        expect(calculator.oeeData[machineId2].oee).to.be.greaterThan(0);
    });
});