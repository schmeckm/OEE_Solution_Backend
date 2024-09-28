describe("Topics API", function() {
    let chai;
    let chaiHttp;
    let server;

    before(async function() {
        chai = await
        import ('chai');
        chaiHttp = await
        import ('chai-http');

        chai = chai.default;
        chaiHttp = chaiHttp.default;

        chai.use(chaiHttp);
        const { default: app } = await
        import ('../server.js'); // Ensure correct path to your server file
        server = app;
    });

    describe("GET /api/v1/topics", function() {
        it("should get all topics", function(done) {
            chai.request(server)
                .get('/api/v1/topics')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    done();
                });
        });

        it("should get topics filtered by plant", function(done) {
            chai.request(server)
                .get('/api/v1/topics?plant=Basel')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    done();
                });
        });

        it("should get topics filtered by area", function(done) {
            chai.request(server)
                .get('/api/v1/topics?area=Packaging')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('array');
                    done();
                });
        });
    });
});