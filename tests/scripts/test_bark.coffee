
Helper = require('hubot-test-helper')
expect = require('chai').expect
http = require('http')

# helper loads a specific script if it's a file
helper = new Helper('../../src/scripts/bark.coffee')

describe 'bark', ->
  beforeEach ->
    @room = helper.createRoom()

  afterEach ->
    @room.destroy()

  context 'user says: bark', ->
    beforeEach ->
      @room.user.say 'briancoia', 'bark'

    it 'should reply bark(s) to user', ->
      expect(@room.messages[0]).to.eql(['briancoia', 'bark'])
      expect(@room.messages[1][1]).to.include('bark')

  context 'user says: hubot tell me a story', ->
    beforeEach ->
      @room.user.say 'briancoia', 'hubot tell me a story'

    it 'should tell a story to user', ->
      expect(@room.messages).to.eql [
        ['briancoia', 'hubot tell me a story']
        ['hubot',     'woof woof woof']
      ]

  context 'user says: good (dog|boy|pup|puppy|ibizan|ibi)', ->
    beforeEach ->
      @room.user.say 'briancoia', 'good boy'

    it 'should display the ultimate seal of gratitude', ->
      expect(@room.messages).to.eql [
        ['briancoia', 'good boy']
        ['hubot',     ':ok_hand:']
      ]

  context 'GET /', ->
    beforeEach (done) ->
      http.get 'http://localhost:8080/', (@response) => done()
      .on 'error', done

    it 'responds with status 200', ->
      expect(@response.statusCode).to.equal 200
