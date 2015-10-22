Promise = require('bluebird')
m = require('mochainon')
nock = require('nock')
rindle = require('rindle')
PassThrough = require('stream').PassThrough
settings = require('resin-settings-client')
request = require('../lib/request')

describe 'Request:', ->

	describe '.send()', ->

		describe 'given a simple GET endpoint', ->

			beforeEach ->

				# Mock /foo with both `query(true)` and without.
				# This is because `query(true)` matches urls with
				# *any* query parameters, but not with none.
				nock(settings.get('apiUrl'))
					.get('/foo').query(true).reply(200, from: 'resin')
					.get('/foo').reply(200, from: 'resin')

			afterEach ->
				nock.cleanAll()

			describe 'given an absolute url', ->

				beforeEach ->
					nock('https://foobar.baz').get('/foo').reply(200, from: 'foobar')

				afterEach ->
					nock.cleanAll()

				it 'should preserve the absolute url', ->
					promise = request.send
						method: 'GET'
						url: 'https://foobar.baz/foo'
					.get('body')
					m.chai.expect(promise).to.eventually.become(from: 'foobar')

			describe 'given there is an api key', ->

				it 'should not send an Authorization header', ->
					promise = request.send
						method: 'GET'
						url: '/foo'
						apikey: 'asdf'
					.get('request')
					.get('headers')
					.get('Authorization')
					m.chai.expect(promise).to.eventually.be.undefined

				it 'should send an apikey query string', ->
					promise = request.send
						method: 'GET'
						url: '/foo'
						apikey: 'asdf'
					.get('request')
					.get('uri')
					.get('query')
					m.chai.expect(promise).to.eventually.equal('apikey=asdf')

				it 'should allow to set custom query string while preserving the api key', ->
					promise = request.send
						method: 'GET'
						url: '/foo'
						apikey: 'asdf'
						qs:
							foo: 'bar'
					.get('request')
					.get('uri')
					.get('query')
					m.chai.expect(promise).to.eventually.equal('foo=bar&apikey=asdf')

			describe 'given there is no api key', ->

				beforeEach ->
					delete process.env[settings.get('apiKeyVariable')]

				it 'should not send an apikey query string', ->
					promise = request.send
						method: 'GET'
						url: '/foo'
					.get('request')
					.get('uri')
					.get('query')
					m.chai.expect(promise).to.eventually.not.exist

		describe 'given multiple endpoints', ->

			beforeEach ->
				nock(settings.get('apiUrl'))
					.get('/foo').reply(200, method: 'GET')
					.post('/foo').reply(200, method: 'POST')
					.put('/foo').reply(200, method: 'PUT')
					.patch('/foo').reply(200, method: 'PATCH')
					.delete('/foo').reply(200, method: 'DELETE')

			afterEach ->
				nock.cleanAll()

			it 'should default to GET', ->
				promise = request.send
					url: '/foo'
				.get('body')
				m.chai.expect(promise).to.eventually.become(method: 'GET')

		describe 'given an endpoint that returns a non json response', ->

			beforeEach ->
				nock(settings.get('apiUrl')).get('/foo').reply(200, 'Hello World')

			afterEach ->
				nock.cleanAll()

			it 'should resolve with the plain body', ->
				promise = request.send
					method: 'GET'
					url: '/foo'
				.get('body')
				m.chai.expect(promise).to.eventually.equal('Hello World')

		describe 'given an endpoint that accepts a non json body', ->

			beforeEach ->
				nock(settings.get('apiUrl')).post('/foo').reply 200, (uri, body) ->
					return "The body is: #{body}"

			afterEach ->
				nock.cleanAll()

			it 'should take the plain body successfully', ->
				promise = request.send
					method: 'POST'
					url: '/foo'
					body: 'Qux'
				.get('body')
				m.chai.expect(promise).to.eventually.equal('The body is: "Qux"')

		describe 'given simple read only endpoints', ->

			describe 'given a GET endpoint', ->

				describe 'given no response error', ->

					beforeEach ->
						nock(settings.get('apiUrl')).get('/foo').reply(200, hello: 'world')

					afterEach ->
						nock.cleanAll()

					it 'should correctly make the request', ->
						promise = request.send
							method: 'GET'
							url: '/foo'
						.get('body')
						m.chai.expect(promise).to.eventually.become(hello: 'world')

				describe 'given a response error', ->

					beforeEach ->
						nock(settings.get('apiUrl')).get('/foo').reply(500, error: text: 'Server Error')

					afterEach ->
						nock.cleanAll()

					it 'should be rejected with the error message', ->
						promise = request.send
							method: 'GET'
							url: '/foo'
						m.chai.expect(promise).to.be.rejectedWith('Server Error')

			describe 'given a HEAD endpoint', ->

				describe 'given no response error', ->

					beforeEach ->
						nock(settings.get('apiUrl')).head('/foo').reply(200)

					afterEach ->
						nock.cleanAll()

					it 'should correctly make the request', ->
						promise = request.send
							method: 'HEAD'
							url: '/foo'
						.get('statusCode')
						m.chai.expect(promise).to.eventually.equal(200)

				describe 'given a response error', ->

					beforeEach ->
						nock(settings.get('apiUrl')).head('/foo').reply(500)

					afterEach ->
						nock.cleanAll()

					it 'should be rejected with a generic error message', ->
						promise = request.send
							method: 'HEAD'
							url: '/foo'
						.get('statusCode')
						m.chai.expect(promise).to.be.rejectedWith('The request was unsuccessful')

		describe 'given simple endpoints that handle a request body', ->

			describe 'given a POST endpoint that mirrors the request body', ->

				beforeEach ->
					nock(settings.get('apiUrl')).post('/foo').reply 200, (uri, body) ->
						return body

				afterEach ->
					nock.cleanAll()

				it 'should eventually return the body', ->
					promise = request.send
						method: 'POST'
						url: '/foo'
						body:
							foo: 'bar'
					.get('body')
					m.chai.expect(promise).to.eventually.become(foo: 'bar')

			describe 'given a PUT endpoint that mirrors the request body', ->

				beforeEach ->
					nock(settings.get('apiUrl')).put('/foo').reply 200, (uri, body) ->
						return body

				afterEach ->
					nock.cleanAll()

				it 'should eventually return the body', ->
					promise = request.send
						method: 'PUT'
						url: '/foo'
						body:
							foo: 'bar'
					.get('body')
					m.chai.expect(promise).to.eventually.become(foo: 'bar')

			describe 'given a PATCH endpoint that mirrors the request body', ->

				beforeEach ->
					nock(settings.get('apiUrl')).patch('/foo').reply 200, (uri, body) ->
						return body

				afterEach ->
					nock.cleanAll()

				it 'should eventually return the body', ->
					promise = request.send
						method: 'PATCH'
						url: '/foo'
						body:
							foo: 'bar'
					.get('body')
					m.chai.expect(promise).to.eventually.become(foo: 'bar')

			describe 'given a DELETE endpoint that mirrors the request body', ->

				beforeEach ->
					nock(settings.get('apiUrl')).delete('/foo').reply 200, (uri, body) ->
						return body

				afterEach ->
					nock.cleanAll()

				it 'should eventually return the body', ->
					promise = request.send
						method: 'DELETE'
						url: '/foo'
						body:
							foo: 'bar'
					.get('body')
					m.chai.expect(promise).to.eventually.become(foo: 'bar')

	describe '.stream()', ->

		describe 'given a simple endpoint that responds with an error', ->

			beforeEach ->
				nock(settings.get('apiUrl')).get('/foo').reply(400, 'Something happened')

			afterEach ->
				nock.cleanAll()

			it 'should reject with the error message', ->
				promise = request.stream
					method: 'GET'
					url: '/foo'

				m.chai.expect(promise).to.be.rejectedWith('Something happened')

		describe 'given a simple endpoint that responds with a string', ->

			beforeEach ->

				# Mock /foo with both `query(true)` and without.
				# This is because `query(true)` matches urls with
				# *any* query parameters, but not with none.
				nock(settings.get('apiUrl'))
					.get('/foo').query(true).reply(200, 'Lorem ipsum dolor sit amet')
					.get('/foo').reply(200, 'Lorem ipsum dolor sit amet')

			afterEach ->
				nock.cleanAll()

			it 'should be able to pipe the response', (done) ->
				request.stream
					method: 'GET'
					url: '/foo'
				.then(rindle.extract).then (data) ->
					m.chai.expect(data).to.equal('Lorem ipsum dolor sit amet')
				.nodeify(done)

			it 'should be able to pipe the response after a delay', (done) ->
				request.stream
					method: 'GET'
					url: '/foo'
				.then (stream) ->
					return Promise.delay(200).return(stream)
				.then (stream) ->
					pass = new PassThrough()
					stream.pipe(pass)

					rindle.extract(pass).then (data) ->
						m.chai.expect(data).to.equal('Lorem ipsum dolor sit amet')
					.nodeify(done)

			describe 'given there is an api key', ->

				it 'should not send an Authorization header', (done) ->
					request.stream
						method: 'GET'
						url: '/foo'
						apikey: 'asdf'
					.then (stream) ->
						m.chai.expect(stream.response.request.headers.Authorization).to.be.undefined
						rindle.extract(stream).return(undefined).nodeify(done)

				it 'should send an apikey query string', (done) ->
					request.stream
						method: 'GET'
						url: '/foo'
						apikey: 'asdf'
					.then (stream) ->
						m.chai.expect(stream.response.request.uri.query).to.equal('apikey=asdf')
						rindle.extract(stream).return(undefined).nodeify(done)

				it 'should allow to set custom query string while preserving the api key', (done) ->
					request.stream
						method: 'GET'
						url: '/foo'
						apikey: 'asdf'
						qs:
							foo: 'bar'
					.then (stream) ->
						m.chai.expect(stream.response.request.uri.query).to.equal('foo=bar&apikey=asdf')
						rindle.extract(stream).return(undefined).nodeify(done)

			describe 'given there is no api key', ->

				it 'should not send an apikey query string', (done) ->
					request.stream
						method: 'GET'
						url: '/foo'
					.then (stream) ->
						m.chai.expect(stream.response.request.uri.query).to.not.exist
						rindle.extract(stream).return(undefined).nodeify(done)

		describe 'given multiple endpoints', ->

			beforeEach ->
				nock(settings.get('apiUrl'))
					.get('/foo').reply(200, 'GET')
					.post('/foo').reply(200, 'POST')
					.put('/foo').reply(200, 'PUT')
					.patch('/foo').reply(200, 'PATCH')
					.delete('/foo').reply(200, 'DELETE')

			afterEach ->
				nock.cleanAll()

			describe 'given no method option', ->

				it 'should default to GET', (done) ->
					request.stream
						url: '/foo'
					.then(rindle.extract).then (data) ->
						m.chai.expect(data).to.equal('GET')
					.nodeify(done)

		describe 'given an endpoint with a content-length header', ->

			beforeEach ->
				message = 'Lorem ipsum dolor sit amet'
				nock(settings.get('apiUrl'))
					.get('/foo').reply(200, message, 'Content-Length': String(message.length))

			afterEach ->
				nock.cleanAll()

			it 'should become a stream with a length property', (done) ->
				request.stream
					url: '/foo'
				.then (stream) ->
					m.chai.expect(stream.length).to.equal(26)
				.nodeify(done)

		describe 'given an endpoint with an invalid content-length header', ->

			beforeEach ->
				message = 'Lorem ipsum dolor sit amet'
				nock(settings.get('apiUrl'))
					.get('/foo').reply(200, message, 'Content-Length': 'Hello')

			afterEach ->
				nock.cleanAll()

			it 'should become a stream with an undefined length property', (done) ->
				request.stream
					url: '/foo'
				.then (stream) ->
					m.chai.expect(stream.length).to.be.undefined
				.nodeify(done)

		describe 'given an endpoint with a content-type header', ->

			beforeEach ->
				message = 'Lorem ipsum dolor sit amet'
				nock(settings.get('apiUrl'))
					.get('/foo').reply(200, message, 'Content-Type': 'application/octet-stream')

			afterEach ->
				nock.cleanAll()

			it 'should become a stream with a mime property', (done) ->
				request.stream
					url: '/foo'
				.then (stream) ->
					m.chai.expect(stream.mime).to.equal('application/octet-stream')
				.nodeify(done)
