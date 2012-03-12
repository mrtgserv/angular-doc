'use strict';

describe('NgModelController', function() {
  var ctrl, scope, ngModelAccessor;

  beforeEach(inject(function($rootScope, $controller) {
    var attrs = {name: 'testAlias'};

    scope = $rootScope;
    ngModelAccessor = jasmine.createSpy('ngModel accessor');
    ctrl = $controller(NgModelController, {$scope: scope, ngModel: ngModelAccessor, $attrs: attrs});

    // mock accessor (locals)
    ngModelAccessor.andCallFake(function(val) {
      if (isDefined(val)) scope.value = val;
      return scope.value;
    });
  }));


  it('should init the properties', function() {
    expect(ctrl.dirty).toBe(false);
    expect(ctrl.pristine).toBe(true);
    expect(ctrl.valid).toBe(true);
    expect(ctrl.invalid).toBe(false);

    expect(ctrl.viewValue).toBeDefined();
    expect(ctrl.modelValue).toBeDefined();

    expect(ctrl.formatters).toEqual([]);
    expect(ctrl.parsers).toEqual([]);

    expect(ctrl.name).toBe('testAlias');
  });


  describe('setValidity', function() {

    it('should propagate invalid to the parent form only when valid', function() {
      var spy = jasmine.createSpy('setValidity');
      ctrl.$form = {$setValidity: spy};

      ctrl.setValidity('ERROR', false);
      expect(spy).toHaveBeenCalledOnceWith('ERROR', false, ctrl);

      spy.reset();
      ctrl.setValidity('ERROR', false);
      expect(spy).not.toHaveBeenCalled();
    });


    it('should set and unset the error', function() {
      ctrl.setValidity('REQUIRED', false);
      expect(ctrl.error.REQUIRED).toBe(true);

      ctrl.setValidity('REQUIRED', true);
      expect(ctrl.error.REQUIRED).toBeUndefined();
    });


    it('should set valid/invalid', function() {
      ctrl.setValidity('FIRST', false);
      expect(ctrl.valid).toBe(false);
      expect(ctrl.invalid).toBe(true);

      ctrl.setValidity('SECOND', false);
      expect(ctrl.valid).toBe(false);
      expect(ctrl.invalid).toBe(true);

      ctrl.setValidity('SECOND', true);
      expect(ctrl.valid).toBe(false);
      expect(ctrl.invalid).toBe(true);

      ctrl.setValidity('FIRST', true);
      expect(ctrl.valid).toBe(true);
      expect(ctrl.invalid).toBe(false);
    });


    it('should emit $valid only when $invalid', function() {
      var spy = jasmine.createSpy('setValidity');
      ctrl.$form = {$setValidity: spy};

      ctrl.setValidity('ERROR', true);
      expect(spy).not.toHaveBeenCalled();

      ctrl.setValidity('ERROR', false);
      expect(spy).toHaveBeenCalledOnceWith('ERROR', false, ctrl);
      spy.reset();
      ctrl.setValidity('ERROR', true);
      expect(spy).toHaveBeenCalledOnceWith('ERROR', true, ctrl);
    });
  });


  describe('view -> model', function() {

    it('should set the value to $viewValue', function() {
      ctrl.setViewValue('some-val');
      expect(ctrl.viewValue).toBe('some-val');
    });


    it('should pipeline all registered parsers and set result to $modelValue', function() {
      var log = [];

      ctrl.parsers.push(function(value) {
        log.push(value);
        return value + '-a';
      });

      ctrl.parsers.push(function(value) {
        log.push(value);
        return value + '-b';
      });

      ctrl.setViewValue('init');
      expect(log).toEqual(['init', 'init-a']);
      expect(ctrl.modelValue).toBe('init-a-b');
    });


    it('should fire viewChangeListeners when the value changes in the view (even if invalid)',
        function() {
      var spy = jasmine.createSpy('viewChangeListener');
      ctrl.viewChangeListeners.push(spy);
      ctrl.setViewValue('val');
      expect(spy).toHaveBeenCalledOnce();
      spy.reset();

      // invalid
      ctrl.parsers.push(function() {return undefined;});
      ctrl.setViewValue('val');
      expect(spy).toHaveBeenCalledOnce();
    });


    it('should reset the model when the view is invalid', function() {
      ctrl.setViewValue('aaaa');
      expect(ctrl.modelValue).toBe('aaaa');

      // add a validator that will make any input invalid
      ctrl.parsers.push(function() {return undefined;});
      expect(ctrl.modelValue).toBe('aaaa');
      ctrl.setViewValue('bbbb');
      expect(ctrl.modelValue).toBeUndefined;
    });


    it('should call parentForm.setDirty only when pristine', function() {
      var spy = jasmine.createSpy('setDirty');
      ctrl.$form = {$setDirty: spy};

      ctrl.setViewValue('');
      expect(ctrl.pristine).toBe(false);
      expect(ctrl.dirty).toBe(true);
      expect(spy).toHaveBeenCalledOnce();

      spy.reset();
      ctrl.setViewValue('');
      expect(ctrl.pristine).toBe(false);
      expect(ctrl.dirty).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });
  });


  describe('model -> view', function() {

    it('should set the value to $modelValue', function() {
      scope.$apply(function() {
        scope.value = 10;
      });
      expect(ctrl.modelValue).toBe(10);
    });


    it('should pipeline all registered formatters in reversed order and set result to $viewValue',
        function() {
      var log = [];

      ctrl.formatters.unshift(function(value) {
        log.push(value);
        return value + 2;
      });

      ctrl.formatters.unshift(function(value) {
        log.push(value);
        return value + '';
      });

      scope.$apply(function() {
        scope.value = 3;
      });
      expect(log).toEqual([3, 5]);
      expect(ctrl.viewValue).toBe('5');
    });


    it('should $render only if value changed', function() {
      spyOn(ctrl, 'render');

      scope.$apply(function() {
        scope.value = 3;
      });
      expect(ctrl.render).toHaveBeenCalledOnce();
      ctrl.render.reset();

      ctrl.formatters.push(function() {return 3;});
      scope.$apply(function() {
        scope.value = 5;
      });
      expect(ctrl.render).not.toHaveBeenCalled();
    });


    it('should clear the view even if invalid', function() {
      spyOn(ctrl, 'render');

      ctrl.formatters.push(function() {return undefined;});
      scope.$apply(function() {
        scope.value = 5;
      });
      expect(ctrl.render).toHaveBeenCalledOnce();
    });
  });
});

describe('ng-model', function() {

  it('should set css classes (ng-valid, ng-invalid, ng-pristine, ng-dirty)',
      inject(function($compile, $rootScope) {
    var element = $compile('<input type="email" ng-model="value" />')($rootScope);

    $rootScope.$digest();
    expect(element).toBeValid();
    expect(element).toBePristine();

    $rootScope.$apply(function() {
      $rootScope.value = 'invalid-email';
    });
    expect(element).toBeInvalid();
    expect(element).toBePristine();

    element.val('invalid-again');
    browserTrigger(element, 'blur');
    expect(element).toBeInvalid();
    expect(element).toBeDirty();

    element.val('vojta@google.com');
    browserTrigger(element, 'blur');
    expect(element).toBeValid();
    expect(element).toBeDirty();

    dealoc(element);
  }));
});


describe('input', function() {
  var formElm, inputElm, scope, $compile;

  function compileInput(inputHtml) {
    formElm = jqLite('<form name="form">' + inputHtml + '</form>');
    inputElm = formElm.find('input');
    $compile(formElm)(scope);
  }

  function changeInputValueTo(value) {
    inputElm.val(value);
    browserTrigger(inputElm, 'blur');
  }

  beforeEach(inject(function($injector) {
    $compile = $injector.get('$compile');
    scope = $injector.get('$rootScope');
  }));

  afterEach(function() {
    dealoc(formElm);
  });


  it('should bind to a model', function() {
    compileInput('<input type="text" ng-model="name" name="alias" ng-change="change()" />');

    scope.$apply(function() {
      scope.name = 'misko';
    });

    expect(inputElm.val()).toBe('misko');
  });


  it('should cleanup it self from the parent form', function() {
    compileInput('<input ng-model="name" name="alias" required>');

    scope.$apply();
    expect(scope.form.error.REQUIRED.length).toBe(1);

    inputElm.remove();
    expect(scope.form.error.REQUIRED).toBeUndefined();
  });


  it('should update the model on "blur" event', function() {
    compileInput('<input type="text" ng-model="name" name="alias" ng-change="change()" />');

    changeInputValueTo('adam');
    expect(scope.name).toEqual('adam');
  });


  it('should update the model and trim the value', function() {
    compileInput('<input type="text" ng-model="name" name="alias" ng-change="change()" />');

    changeInputValueTo('  a  ');
    expect(scope.name).toEqual('a');
  });


  it('should allow complex reference binding', function() {
    compileInput('<input type="text" ng-model="obj[\'abc\'].name"/>');

    scope.$apply(function() {
      scope.obj = { abc: { name: 'Misko'} };
    });
    expect(inputElm.val()).toEqual('Misko');
  });


  it('should ignore input without ng-model attr', function() {
    compileInput('<input type="text" name="whatever" required />');

    browserTrigger(inputElm, 'blur');
    expect(inputElm.hasClass('ng-valid')).toBe(false);
    expect(inputElm.hasClass('ng-invalid')).toBe(false);
    expect(inputElm.hasClass('ng-pristine')).toBe(false);
    expect(inputElm.hasClass('ng-dirty')).toBe(false);
  });


  it('should report error on assignment error', function() {
    expect(function() {
      compileInput('<input type="text" ng-model="throw \'\'">');
      scope.$digest();
    }).toThrow("Syntax Error: Token '''' is an unexpected token at column 7 of the expression [throw ''] starting at [''].");
  });


  it("should render as blank if null", function() {
    compileInput('<input type="text" ng-model="age" />');

    scope.$apply(function() {
      scope.age = null;
    });

    expect(scope.age).toBeNull();
    expect(inputElm.val()).toEqual('');
  });


  it('should render 0 even if it is a number', function() {
    compileInput('<input type="text" ng-model="value" />');
    scope.$apply(function() {
      scope.value = 0;
    });

    expect(inputElm.val()).toBe('0');
  });


  describe('pattern', function() {

    it('should validate in-lined pattern', function() {
      compileInput('<input type="text" ng-model="value" ng-pattern="/^\\d\\d\\d-\\d\\d-\\d\\d\\d\\d$/" />');
      scope.$digest();

      changeInputValueTo('x000-00-0000x');
      expect(inputElm).toBeInvalid();

      changeInputValueTo('000-00-0000');
      expect(inputElm).toBeValid();

      changeInputValueTo('000-00-0000x');
      expect(inputElm).toBeInvalid();

      changeInputValueTo('123-45-6789');
      expect(inputElm).toBeValid();

      changeInputValueTo('x');
      expect(inputElm).toBeInvalid();
    });


    it('should validate pattern from scope', function() {
      compileInput('<input type="text" ng-model="value" ng-pattern="regexp" />');
      scope.regexp = /^\d\d\d-\d\d-\d\d\d\d$/;
      scope.$digest();

      changeInputValueTo('x000-00-0000x');
      expect(inputElm).toBeInvalid();

      changeInputValueTo('000-00-0000');
      expect(inputElm).toBeValid();

      changeInputValueTo('000-00-0000x');
      expect(inputElm).toBeInvalid();

      changeInputValueTo('123-45-6789');
      expect(inputElm).toBeValid();

      changeInputValueTo('x');
      expect(inputElm).toBeInvalid();

      scope.regexp = /abc?/;

      changeInputValueTo('ab');
      expect(inputElm).toBeValid();

      changeInputValueTo('xx');
      expect(inputElm).toBeInvalid();
    });


    xit('should throw an error when scope pattern can\'t be found', function() {
      compileInput('<input type="text" ng-model="foo" ng-pattern="fooRegexp" />');

      expect(function() { changeInputValueTo('xx'); }).
          toThrow('Expected fooRegexp to be a RegExp but was undefined');
    });
  });


  describe('minlength', function() {

    it('should invalid shorter than given minlenght', function() {
      compileInput('<input type="text" ng-model="value" ng-minlength="3" />');

      changeInputValueTo('aa');
      expect(scope.value).toBeUndefined();

      changeInputValueTo('aaa');
      expect(scope.value).toBe('aaa');
    });
  });


  describe('maxlength', function() {

    it('should invalid shorter than given maxlenght', function() {
      compileInput('<input type="text" ng-model="value" ng-maxlength="5" />');

      changeInputValueTo('aaaaaaaa');
      expect(scope.value).toBeUndefined();

      changeInputValueTo('aaa');
      expect(scope.value).toBe('aaa');
    });
  });


  // INPUT TYPES

  describe('number', function() {

    it('should reset the model if view is invalid', function() {
      compileInput('<input type="number" ng-model="age"/>');

      scope.$apply(function() {
        scope.age = 123;
      });
      expect(inputElm.val()).toBe('123');

      try {
        // to allow non-number values, we have to change type so that
        // the browser which have number validation will not interfere with
        // this test. IE8 won't allow it hence the catch.
        inputElm[0].setAttribute('type', 'text');
      } catch (e) {}

      changeInputValueTo('123X');
      expect(inputElm.val()).toBe('123X');
      expect(scope.age).toBeUndefined();
      expect(inputElm).toBeInvalid();
    });


    it('should render as blank if null', function() {
      compileInput('<input type="number" ng-model="age" />');

      scope.$apply(function() {
        scope.age = null;
      });

      expect(scope.age).toBeNull();
      expect(inputElm.val()).toEqual('');
    });


    it('should come up blank when no value specified', function() {
      compileInput('<input type="number" ng-model="age" />');

      scope.$digest();
      expect(inputElm.val()).toBe('');

      scope.$apply(function() {
        scope.age = null;
      });

      expect(scope.age).toBeNull();
      expect(inputElm.val()).toBe('');
    });


    it('should parse empty string to null', function() {
      compileInput('<input type="number" ng-model="age" />');

      scope.$apply(function() {
        scope.age = 10;
      });

      changeInputValueTo('');
      expect(scope.age).toBeNull();
      expect(inputElm).toBeValid();
    });


    describe('min', function() {

      it('should validate', function() {
        compileInput('<input type="number" ng-model="value" name="alias" min="10" />');
        scope.$digest();

        changeInputValueTo('1');
        expect(inputElm).toBeInvalid();
        expect(scope.value).toBeFalsy();
        expect(scope.form.alias.error.MIN).toBeTruthy();

        changeInputValueTo('100');
        expect(inputElm).toBeValid();
        expect(scope.value).toBe(100);
        expect(scope.form.alias.error.MIN).toBeFalsy();
      });
    });


    describe('max', function() {

      it('should validate', function() {
        compileInput('<input type="number" ng-model="value" name="alias" max="10" />');
        scope.$digest();

        changeInputValueTo('20');
        expect(inputElm).toBeInvalid();
        expect(scope.value).toBeFalsy();
        expect(scope.form.alias.error.MAX).toBeTruthy();

        changeInputValueTo('0');
        expect(inputElm).toBeValid();
        expect(scope.value).toBe(0);
        expect(scope.form.alias.error.MAX).toBeFalsy();
      });
    });


    describe('required', function() {

      it('should be valid even if value is 0', function() {
        compileInput('<input type="number" ng-model="value" name="alias" required />');

        changeInputValueTo('0');
        expect(inputElm).toBeValid();
        expect(scope.value).toBe(0);
        expect(scope.form.alias.error.REQUIRED).toBeFalsy();
      });

      it('should be valid even if value 0 is set from model', function() {
        compileInput('<input type="number" ng-model="value" name="alias" required />');

        scope.$apply(function() {
          scope.value = 0;
        });

        expect(inputElm).toBeValid();
        expect(inputElm.val()).toBe('0')
        expect(scope.form.alias.error.REQUIRED).toBeFalsy();
      });
    });
  });

  describe('email', function() {

    it('should validate e-mail', function() {
      compileInput('<input type="email" ng-model="email" name="alias" />');

      var widget = scope.form.alias;
      changeInputValueTo('vojta@google.com');

      expect(scope.email).toBe('vojta@google.com');
      expect(inputElm).toBeValid();
      expect(widget.error.EMAIL).toBeUndefined();

      changeInputValueTo('invalid@');
      expect(scope.email).toBeUndefined();
      expect(inputElm).toBeInvalid();
      expect(widget.error.EMAIL).toBeTruthy();
    });


    describe('EMAIL_REGEXP', function() {

      it('should validate email', function() {
        expect(EMAIL_REGEXP.test('a@b.com')).toBe(true);
        expect(EMAIL_REGEXP.test('a@B.c')).toBe(false);
      });
    });
  });


  describe('url', function() {

    it('should validate url', function() {
      compileInput('<input type="url" ng-model="url" name="alias" />');
      var widget = scope.form.alias;

      changeInputValueTo('http://www.something.com');
      expect(scope.url).toBe('http://www.something.com');
      expect(inputElm).toBeValid();
      expect(widget.error.URL).toBeUndefined();

      changeInputValueTo('invalid.com');
      expect(scope.url).toBeUndefined();
      expect(inputElm).toBeInvalid();
      expect(widget.error.URL).toBeTruthy();
    });


    describe('URL_REGEXP', function() {

      it('should validate url', function() {
        expect(URL_REGEXP.test('http://server:123/path')).toBe(true);
        expect(URL_REGEXP.test('a@B.c')).toBe(false);
      });
    });
  });


  describe('radio', function() {

    it('should update the model', function() {
      compileInput(
          '<input type="radio" ng-model="color" value="white" />' +
          '<input type="radio" ng-model="color" value="red" />' +
          '<input type="radio" ng-model="color" value="blue" />');

      scope.$apply(function() {
        scope.color = 'white';
      });
      expect(inputElm[0].checked).toBe(true);
      expect(inputElm[1].checked).toBe(false);
      expect(inputElm[2].checked).toBe(false);

      scope.$apply(function() {
        scope.color = 'red';
      });
      expect(inputElm[0].checked).toBe(false);
      expect(inputElm[1].checked).toBe(true);
      expect(inputElm[2].checked).toBe(false);

      browserTrigger(inputElm[2]);
      expect(scope.color).toBe('blue');
    });


    // TODO(vojta): change interpolate ?
    xit('should allow {{expr}} as value', function() {
      scope.some = 11;
      compileInput(
          '<input type="radio" ng-model="value" value="{{some}}" />' +
          '<input type="radio" ng-model="value" value="{{other}}" />');

      browserTrigger(inputElm[0]);
      expect(scope.value).toBe(true);

      browserTrigger(inputElm[1]);
      expect(scope.value).toBe(false);
    });
  });


  describe('checkbox', function() {

    it('should ignore checkbox without ng-model attr', function() {
      compileInput('<input type="checkbox" name="whatever" required />');

      browserTrigger(inputElm, 'blur');
      expect(inputElm.hasClass('ng-valid')).toBe(false);
      expect(inputElm.hasClass('ng-invalid')).toBe(false);
      expect(inputElm.hasClass('ng-pristine')).toBe(false);
      expect(inputElm.hasClass('ng-dirty')).toBe(false);
    });


    it('should format booleans', function() {
      compileInput('<input type="checkbox" ng-model="name" />');

      scope.$apply(function() {
        scope.name = false;
      });
      expect(inputElm[0].checked).toBe(false);

      scope.$apply(function() {
        scope.name = true;
      });
      expect(inputElm[0].checked).toBe(true);
    });


    it('should support type="checkbox" with non-standard capitalization', function() {
      compileInput('<input type="checkBox" ng-model="checkbox" />');

      browserTrigger(inputElm, 'click');
      expect(scope.checkbox).toBe(true);

      browserTrigger(inputElm, 'click');
      expect(scope.checkbox).toBe(false);
    });


    it('should allow custom enumeration', function() {
      compileInput('<input type="checkbox" ng-model="name" ng-true-value="y" ' +
          'ng-false-value="n">');

      scope.$apply(function() {
        scope.name = 'y';
      });
      expect(inputElm[0].checked).toBe(true);

      scope.$apply(function() {
        scope.name = 'n';
      });
      expect(inputElm[0].checked).toBe(false);

      scope.$apply(function() {
        scope.name = 'something else';
      });
      expect(inputElm[0].checked).toBe(false);

      browserTrigger(inputElm, 'click');
      expect(scope.name).toEqual('y');

      browserTrigger(inputElm, 'click');
      expect(scope.name).toEqual('n');
    });


    it('should be required if false', function() {
      compileInput('<input type="checkbox" ng:model="value" required />');

      browserTrigger(inputElm, 'click');
      expect(inputElm[0].checked).toBe(true);
      expect(inputElm).toBeValid();

      browserTrigger(inputElm, 'click');
      expect(inputElm[0].checked).toBe(false);
      expect(inputElm).toBeInvalid();
    });
  });


  describe('textarea', function() {

    it("should process textarea", function() {
      compileInput('<textarea ng-model="name"></textarea>');
      inputElm = formElm.find('textarea');

      scope.$apply(function() {
        scope.name = 'Adam';
      });
      expect(inputElm.val()).toEqual('Adam');

      changeInputValueTo('Shyam');
      expect(scope.name).toEqual('Shyam');

      changeInputValueTo('Kai');
      expect(scope.name).toEqual('Kai');
    });


    it('should ignore textarea without ng-model attr', function() {
      compileInput('<textarea name="whatever" required></textarea>');
      inputElm = formElm.find('textarea');

      browserTrigger(inputElm, 'blur');
      expect(inputElm.hasClass('ng-valid')).toBe(false);
      expect(inputElm.hasClass('ng-invalid')).toBe(false);
      expect(inputElm.hasClass('ng-pristine')).toBe(false);
      expect(inputElm.hasClass('ng-dirty')).toBe(false);
    });
  });


  describe('ng-list', function() {

    it('should parse text into an array', function() {
      compileInput('<input type="text" ng-model="list" ng-list />');

      // model -> view
      scope.$apply(function() {
        scope.list = ['x', 'y', 'z'];
      });
      expect(inputElm.val()).toBe('x, y, z');

      // view -> model
      changeInputValueTo('1, 2, 3');
      expect(scope.list).toEqual(['1', '2', '3']);
    });


    it("should not clobber text if model changes due to itself", function() {
      // When the user types 'a,b' the 'a,' stage parses to ['a'] but if the
      // $parseModel function runs it will change to 'a', in essence preventing
      // the user from ever typying ','.
      compileInput('<input type="text" ng-model="list" ng-list />');

      changeInputValueTo('a ');
      expect(inputElm.val()).toEqual('a ');
      expect(scope.list).toEqual(['a']);

      changeInputValueTo('a ,');
      expect(inputElm.val()).toEqual('a ,');
      expect(scope.list).toEqual(['a']);

      changeInputValueTo('a , ');
      expect(inputElm.val()).toEqual('a , ');
      expect(scope.list).toEqual(['a']);

      changeInputValueTo('a , b');
      expect(inputElm.val()).toEqual('a , b');
      expect(scope.list).toEqual(['a', 'b']);
    });


    xit('should require at least one item', function() {
      compileInput('<input type="text" ng-model="list" ng-list required />');

      changeInputValueTo(' , ');
      expect(inputElm).toBeInvalid();
    });


    it('should convert empty string to an empty array', function() {
      compileInput('<input type="text" ng-model="list" ng-list />');

      changeInputValueTo('');
      expect(scope.list).toEqual([]);
    });
  });

  describe('required', function() {

    it('should allow bindings on required', function() {
      compileInput('<input type="text" ng-model="value" required="{{required}}" />');

      scope.$apply(function() {
        scope.required = false;
      });

      changeInputValueTo('');
      expect(inputElm).toBeValid();


      scope.$apply(function() {
        scope.required = true;
      });
      expect(inputElm).toBeInvalid();

      scope.$apply(function() {
        scope.value = 'some';
      });
      expect(inputElm).toBeValid();

      changeInputValueTo('');
      expect(inputElm).toBeInvalid();

      scope.$apply(function() {
        scope.required = false;
      });
      expect(inputElm).toBeValid();
    });


    it('should invalid initial value with bound required', function() {
      compileInput('<input type="text" ng-model="value" required="{{required}}" />');

      scope.$apply(function() {
        scope.required = true;
      });

      expect(inputElm).toBeInvalid();
    });


    it('should be $invalid but $pristine if not touched', function() {
      compileInput('<input type="text" ng-model="name" name="alias" required />');

      scope.$apply(function() {
        scope.name = '';
      });

      expect(inputElm).toBeInvalid();
      expect(inputElm).toBePristine();

      changeInputValueTo('');
      expect(inputElm).toBeInvalid();
      expect(inputElm).toBeDirty();
    });


    it('should allow empty string if not required', function() {
      compileInput('<input type="text" ng-model="foo" />');
      changeInputValueTo('a');
      changeInputValueTo('');
      expect(scope.foo).toBe('');
    });


    it('should set $invalid when model undefined', function() {
      compileInput('<input type="text" ng-model="notDefiend" required />');
      scope.$digest();
      expect(inputElm).toBeInvalid();
    })
  });


  describe('ng-change', function() {

    it('should $eval expression after new value is set in the model', function() {
      compileInput('<input type="text" ng-model="value" ng-change="change()" />');

      scope.change = jasmine.createSpy('change').andCallFake(function() {
        expect(scope.value).toBe('new value');
      });

      changeInputValueTo('new value');
      expect(scope.change).toHaveBeenCalledOnce();
    });

    it('should not $eval the expression if changed from model', function() {
      compileInput('<input type="text" ng-model="value" ng-change="change()" />');

      scope.change = jasmine.createSpy('change');
      scope.$apply(function() {
        scope.value = true;
      });

      expect(scope.change).not.toHaveBeenCalled();
    });


    it('should $eval ng-change expression on checkbox', function() {
      compileInput('<input type="checkbox" ng-model="foo" ng-change="changeFn()">');

      scope.changeFn = jasmine.createSpy('changeFn');
      scope.$digest();
      expect(scope.changeFn).not.toHaveBeenCalled();

      browserTrigger(inputElm, 'click');
      expect(scope.changeFn).toHaveBeenCalledOnce();
    });
  });


  describe('ng-model-instant', function() {

    it('should bind keydown, change, input events', inject(function($browser) {
      compileInput('<input type="text" ng-model="value" ng-model-instant />');

      inputElm.val('value1');
      browserTrigger(inputElm, 'keydown');

      // should be async (because of keydown)
      expect(scope.value).toBeUndefined();

      $browser.defer.flush();
      expect(scope.value).toBe('value1');

      inputElm.val('value2');
      browserTrigger(inputElm, 'change');
      expect(scope.value).toBe('value2');

      if (msie < 9) return;

      inputElm.val('value3');
      browserTrigger(inputElm, 'input');
      expect(scope.value).toBe('value3');
    }));
  });
});