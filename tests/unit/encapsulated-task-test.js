import { run } from '@ember/runloop';
import RSVP from 'rsvp';
import EmberObject from '@ember/object';
import { reads } from '@ember/object/computed';
import { task } from 'ember-concurrency';
import { module, test } from 'qunit';
import { decoratorTest } from '../helpers/helpers';

module('Unit: EncapsulatedTask', function () {
  test('encapsulated tasks can be specified via a pojos with perform methods', function (assert) {
    assert.expect(2);

    let defer;
    let Obj = EmberObject.extend({
      myTask: task({
        *perform(...args) {
          assert.deepEqual(args, [1, 2, 3]);
          defer = RSVP.defer();
          yield defer.promise;
          return 123;
        },
      }),
    });

    let obj;
    run(() => {
      obj = Obj.create();
      obj.myTask.perform(1, 2, 3).then((v) => {
        assert.equal(v, 123);
      });
    });
    run(defer, 'resolve');
  });

  test('encapsulated tasks can have their state accessed', async function (assert) {
    assert.expect(2);

    let defer;
    let Obj = EmberObject.extend({
      myTask: task({
        someProp: false,

        *perform() {
          defer = RSVP.defer();
          yield defer.promise;
          this.set('someProp', true);
        },
      }),
    });

    let obj = Obj.create();
    const taskInstance = obj.myTask.perform(1, 2, 3);
    assert.false(taskInstance.someProp);

    defer.resolve();
    await taskInstance;
    assert.true(taskInstance.someProp);
  });

  test('encapsulated tasks can access host context', async function (assert) {
    assert.expect(1);

    let defer;
    let Obj = EmberObject.extend({
      mySecretValue: 'pickle',

      myTask: task({
        someProp: false,

        *perform() {
          defer = RSVP.defer();
          yield defer.promise;
          return this.context.mySecretValue;
        },
      }),
    });

    let obj = Obj.create();
    const taskInstance = obj.myTask.perform();

    defer.resolve();
    const value = await taskInstance;
    assert.equal(value, 'pickle');
  });

  test('encapsulated tasks can access task instance context', async function (assert) {
    assert.expect(2);

    let defer;
    let Obj = EmberObject.extend({
      myTask: task({
        amIRunning: reads('isRunning'),

        *perform() {
          defer = RSVP.defer();
          yield defer.promise;
          return 'blah';
        },
      }),
    });

    let obj = Obj.create();
    const taskInstance = obj.myTask.perform();
    assert.true(taskInstance.amIRunning);

    defer.resolve();
    await taskInstance;
    assert.false(taskInstance.amIRunning);
  });

  decoratorTest(
    'encapsulated tasks work with native ES classes and decorators',
    function (assert) {
      assert.expect(2);

      let defer;

      class FakeGlimmerComponent {
        @task myTask = {
          *perform(...args) {
            assert.deepEqual(args, [1, 2, 3]);
            defer = RSVP.defer();
            yield defer.promise;
            return 123;
          },
        };
      }

      let obj;
      run(() => {
        obj = new FakeGlimmerComponent();
        obj.myTask.perform(1, 2, 3).then((v) => {
          assert.equal(v, 123);
        });
      });
      run(defer, 'resolve');
    }
  );
});
