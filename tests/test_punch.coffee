
expect = require('chai').expect

Punch = require '../src/models/punch.coffee'

describe 'Punch', ->
  describe '#constructor', ->

  describe '#parse(user, command, mode)', ->
    it 'should return if user and command are not defined'