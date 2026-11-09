/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles */
// "Same screens, same calls" tests: render each page with a fake server (no network),
// click through it, and snapshot the exact HTML plus every request the page makes.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: (p: any) => <button data-testid="scan" onClick={() => p.onScan([{ rawValue: 'tok' }])}>scanner</button>,
}));

import { Login } from '../src/pages/Login';
import { AdultDashboard } from '../src/pages/AdultDashboard';
import { ChildDashboard } from '../src/pages/ChildDashboard';

const users = [
  { id: 1, name: 'Mom', role: 'adult', current_balance: 0, sms_email: 'a@x' },
  { id: 2, name: 'Sam', role: 'child', current_balance: 7.5, sms_email: '' },
  { id: 3, name: 'Lee', role: 'child', current_balance: 3, sms_email: '' },
];
const chores = [
  { id: 1, title: 'Dishes', type: 'daily', reward_value: 1, assigned_day: 0, target_user_id: null },
  { id: 2, title: 'Trash', type: 'weekly', reward_value: 2.5, assigned_day: 3, target_user_id: 2, target_user_name: 'Sam' },
];
const mkAssign = (n: number, uid: number, status: string) =>
  Array.from({ length: n }, (_, i) => ({ id: uid * 100 + i, chore_id: 1, user_id: uid, status, chore_title: `Chore ${uid}-${i}`, reward_value: 1.25 + i }));
let calls: string[];
let server: Record<string, (init?: any) => { ok?: boolean; body: any }>;

function fakeFetch(url: string, init?: any) {
  const key = `${init?.method || 'GET'} ${url}`;
  calls.push(init?.body ? `${key} ${init.body}` : key);
  const h = server[key];
  if (!h) return Promise.reject(new Error('no route ' + key));
  const r = h(init);
  return Promise.resolve({ ok: r.ok ?? true, json: async () => r.body });
}
const nav = vi.fn();
function Where() { const l = useLocation(); nav(l.pathname); return null; }
function mount(el: React.ReactElement, path = '/x') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Where />
      <Routes><Route path="/x" element={el} /><Route path="*" element={<div>HOME</div>} /></Routes>
    </MemoryRouter>);
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });
const paths = () => nav.mock.calls.map(c => c[0]).filter((p, i, a) => i === 0 || p !== a[i - 1]);

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => (m.has(k) ? m.get(k)! : null), setItem: (k: string, v: string) => void m.set(k, String(v)), removeItem: (k: string) => void m.delete(k), clear: () => m.clear() };
}
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  calls = []; nav.mockClear();
  vi.stubGlobal('fetch', fakeFetch);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  server = {
    'GET /api/users': () => ({ body: users }),
    'GET /api/chores': () => ({ body: chores }),
    'GET /api/users/2': () => ({ body: users[1] }),
    'GET /api/assignments/user/2': () => ({ body: [...mkAssign(3, 2, 'pending'), { ...mkAssign(1, 2, 'rejected')[0], id: 299 }, ...mkAssign(1, 2, 'awaiting_verification')] }),
    'GET /api/assignments/user/3': () => ({ body: mkAssign(3, 3, 'awaiting_verification') }),
  };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Login', () => {
  it('idle screen', () => { const { container } = mount(<Login />); expect(container.innerHTML).toMatchSnapshot(); });
  it('child scan goes to child dashboard and stores session', async () => {
    server['POST /api/auth/login'] = () => ({ body: { user: users[1], token: 'T' } });
    mount(<Login />); fireEvent.click(screen.getByTestId('scan')); await flush();
    expect(calls).toMatchSnapshot(); expect(paths()).toEqual(['/x', '/child-dashboard']);
    expect([localStorage.getItem('kiosk_user'), localStorage.getItem('kiosk_token')]).toMatchSnapshot();
  });
  it('adult scan goes to adult dashboard', async () => {
    server['POST /api/auth/login'] = () => ({ body: { user: users[0], token: 'T' } });
    mount(<Login />); fireEvent.click(screen.getByTestId('scan')); await flush();
    expect(paths()).toEqual(['/x', '/adult-dashboard']);
  });
  it('bad badge shows message', async () => {
    server['POST /api/auth/login'] = () => ({ ok: false, body: { error: 'Invalid or expired QR code' } });
    const { container } = mount(<Login />); fireEvent.click(screen.getByTestId('scan')); await flush();
    expect(container.innerHTML).toMatchSnapshot();
  });
  it('bad badge without text', async () => {
    server['POST /api/auth/login'] = () => ({ ok: false, body: {} });
    const { container } = mount(<Login />); fireEvent.click(screen.getByTestId('scan')); await flush();
    expect(container.innerHTML).toMatchSnapshot();
  });
  it('network error shows message', async () => {
    const { container } = mount(<Login />); fireEvent.click(screen.getByTestId('scan')); await flush();
    expect(container.innerHTML).toMatchSnapshot();
  });
});

describe('ChildDashboard', () => {
  it('redirects when not logged in as child', async () => {
    mount(<ChildDashboard />); await flush();
    expect(paths()).toEqual(['/x', '/']); expect(calls).toEqual([]);
  });
  it('screens, tabs, paging and finishing a chore', async () => {
    localStorage.setItem('kiosk_token', 't'); localStorage.setItem('kiosk_user', JSON.stringify(users[1]));
    server['PATCH /api/assignments/200/status'] = () => ({ body: {} });
    const { container } = mount(<ChildDashboard />); await flush();
    const snaps: string[] = [container.innerHTML];
    const btn = (t: string) => screen.getAllByRole('button').find(b => b.textContent === t)!;
    fireEvent.click(btn('›')); snaps.push(container.innerHTML);
    fireEvent.click(btn('›')); snaps.push(container.innerHTML);
    fireEvent.click(btn('‹')); snaps.push(container.innerHTML);
    fireEvent.click(screen.getByText('Pending Review')); snaps.push(container.innerHTML);
    fireEvent.click(screen.getByText(/To-Do List/)); snaps.push(container.innerHTML);
    fireEvent.click(screen.getAllByText(/I Finished It/)[0]); await flush(); snaps.push(container.innerHTML);
    expect(snaps).toMatchSnapshot(); expect(calls).toMatchSnapshot();
  });
  it('failed chore update shows the same alert', async () => {
    localStorage.setItem('kiosk_token', 't'); localStorage.setItem('kiosk_user', JSON.stringify(users[1]));
    const alertSpy = vi.fn(); vi.stubGlobal('alert', alertSpy);
    mount(<ChildDashboard />); await flush();
    fireEvent.click(screen.getAllByText(/I Finished It/)[0]); await flush();
    expect(alertSpy.mock.calls).toEqual([['Network error updating chore.']]);
  });
});

describe('AdultDashboard', () => {
  const login = () => { localStorage.setItem('kiosk_token', 't'); localStorage.setItem('kiosk_user', JSON.stringify(users[0])); };
  it('redirects when not an adult', async () => {
    localStorage.setItem('kiosk_token', 't'); localStorage.setItem('kiosk_user', JSON.stringify(users[1]));
    mount(<AdultDashboard />); await flush();
    expect(paths()).toEqual(['/x', '/']);
  });
  it('every tab, paging, add-chore form and actions', async () => {
    login();
    server['PATCH /api/assignments/300/status'] = () => ({ body: {} });
    server['PATCH /api/assignments/200/status'] = () => ({ body: {} });
    server['POST /api/chores'] = () => ({ body: {} });
    server['DELETE /api/chores/1'] = () => ({ body: {} });
    server['POST /api/transactions/payout'] = () => ({ body: {} });
    const alerts: any[] = []; vi.stubGlobal('alert', (m: any) => alerts.push(m));
    vi.stubGlobal('confirm', () => true);
    vi.stubGlobal('prompt', () => '2.50');
    const { container } = mount(<AdultDashboard />); await flush();
    const snaps: string[] = [container.innerHTML];
    const arrows = () => screen.getAllByRole('button').filter(b => b.querySelector('svg') && b.textContent === '');
    fireEvent.click(arrows()[1]); snaps.push(container.innerHTML);
    fireEvent.click(arrows()[0]); snaps.push(container.innerHTML);
    fireEvent.click(screen.getAllByText(/Approve/)[0]); await flush(); snaps.push(container.innerHTML);
    fireEvent.click(screen.getByText('Kids & Payouts')); snaps.push(container.innerHTML);
    fireEvent.click(screen.getAllByText(/Payout/)[0]); await flush(); snaps.push(container.innerHTML);
    fireEvent.click(screen.getByText('Manage Tasks')); snaps.push(container.innerHTML);
    fireEvent.click(screen.getByText(/Add/)); snaps.push(container.innerHTML);
    fireEvent.change(container.querySelector('input[placeholder^="Chore Title"]')!, { target: { value: 'Mow' } });
    snaps.push(container.innerHTML);
    fireEvent.submit(container.querySelector('form')!); await flush(); snaps.push(container.innerHTML);
    fireEvent.click(screen.getAllByText('Delete')[0]); await flush(); snaps.push(container.innerHTML);
    expect(snaps).toMatchSnapshot(); expect(calls).toMatchSnapshot(); expect(alerts).toMatchSnapshot();
  });
});
