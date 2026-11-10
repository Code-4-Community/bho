import { getDb } from '../src/connection';
import { tx } from '../src/tx';

jest.mock('../src/connection');

// Makes getDb() return a db whose transactions fail with each of `errors`
// first, then run `fn`.
function fakeDb(errors: unknown[]) {
  const execute = jest.fn(async (fn: (trx: unknown) => Promise<unknown>) => {
    const error = errors.shift();
    if (error) throw error;
    return fn('trx');
  });
  jest.mocked(getDb).mockReturnValue({
    transaction: () => ({ execute }),
  } as unknown as ReturnType<typeof getDb>);
  return { execute };
}

const coded = (code: string) => Object.assign(new Error(code), { code });

describe('tx', () => {
  it('hands the transaction to fn and returns its result', async () => {
    fakeDb([]);

    await expect(tx(async (trx) => `got ${trx}`)).resolves.toBe('got trx');
  });

  it.each(['40001', '40P01'])('retries %s', async (code) => {
    const { execute } = fakeDb([coded(code)]);

    await expect(tx(async () => 'ok')).resolves.toBe('ok');
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('gives up after the given number of attempts', async () => {
    const error = coded('40001');
    const { execute } = fakeDb([error, error, error, error]);

    await expect(tx(async () => 'ok', 3)).rejects.toBe(error);
    expect(execute).toHaveBeenCalledTimes(3);
  });

  it('does not retry other errors', async () => {
    const error = coded('23505');
    const { execute } = fakeDb([error]);

    await expect(tx(async () => 'ok')).rejects.toBe(error);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
