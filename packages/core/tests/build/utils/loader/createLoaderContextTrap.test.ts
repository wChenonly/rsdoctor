import { describe, it, expect, rs } from '@rstest/core';
import { Loader } from '@rsdoctor/utils/common';
import { createLoaderContextTrap } from '@/build-utils/build/utils';

describe('test utils/loader.ts createLoaderContextTrap()', () => {
  it('this.callback', () => {
    const fn = rs.fn();
    const final = rs.fn();
    // @ts-ignore
    const trap = createLoaderContextTrap.call({ async: () => fn }, final);

    expect(trap.async).toBeInstanceOf(Function);
    expect(trap.async === fn).toBeFalsy();

    const cb = trap.async();
    // @ts-ignore
    cb(1, 2, 3);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(1, 2, 3);
    expect(final).toBeCalledTimes(1);
    expect(final).toBeCalledWith(1, 2, 3);
  });

  it('this.async', () => {
    const fn = rs.fn();
    const final = rs.fn();
    // @ts-ignore
    const trap = createLoaderContextTrap.call({ callback: fn }, final);

    expect(trap.callback).toBeInstanceOf(Function);
    expect(trap.callback === fn).toBeFalsy();

    // @ts-ignore
    trap.callback(1, 2, 3);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith(1, 2, 3);
    expect(final).toBeCalledTimes(1);
    expect(final).toBeCalledWith(1, 2, 3);
  });

  it('this.query is string', () => {
    const final = rs.fn();
    const trap = createLoaderContextTrap.call(
      // @ts-ignore
      { query: `?a=1&"${Loader.LoaderInternalPropertyName}":{aa:1,b:4}` },
      final,
    );
    expect(trap.query).toEqual('?a=1&');
  });

  it('this.query is object', () => {
    const final = rs.fn();
    const trap1 = createLoaderContextTrap.call(
      // @ts-ignore
      {
        query: {
          [Loader.LoaderInternalPropertyName]: { hasOptions: true },
          a: 1,
        },
      },
      final,
    );
    expect(trap1.query).toStrictEqual({ a: 1 });

    const trap2 = createLoaderContextTrap.call(
      // @ts-ignore
      {
        query: {
          [Loader.LoaderInternalPropertyName]: {
            hasOptions: false,
            loader: './loader1?xyz=1!loader2!./resource?rrr',
          },
          a: 1,
        },
      },
      final,
    );
    expect(trap2.query).toEqual('?xyz=1!loader2!./resource?rrr');
  });

  it('this.query is neither string or object', () => {
    const final = rs.fn();
    // @ts-ignore
    const trap1 = createLoaderContextTrap.call({}, final);
    expect(trap1.query).toBeUndefined();

    // @ts-ignore
    const trap2 = createLoaderContextTrap.call({ query: true }, final);
    expect(trap2.query).toEqual(true);
  });

  it('this.getOptions', () => {
    const final = rs.fn();
    // @ts-ignore
    const trap1 = createLoaderContextTrap.call({}, final);
    expect(trap1.getOptions).toBeUndefined();

    const trap2 = createLoaderContextTrap.call(
      // @ts-ignore
      {
        getOptions: () => ({
          [Loader.LoaderInternalPropertyName]: { a: 1 },
          b: 2,
        }),
      },
      final,
    );
    expect(trap2.getOptions()).toStrictEqual({ b: 2 });
  });
});
