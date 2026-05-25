import { test, expect } from '@playwright/test'

// Runs under the "free" project (storageState = free admin).
test('admin can enable child upgrade and the flag flows through the API', async ({ request }) => {
  const suffix = Date.now()
  // 1. Create a throwaway child as the admin.
  const createRes = await request.post('/api/household/members/add-child', {
    data: { name: `Upgrade Kid ${suffix}`, pin: '4321' },
  })
  expect(createRes.ok()).toBeTruthy()

  // 2. Find the child's member id from the members list.
  const listRes = await request.get('/api/household/members')
  expect(listRes.ok()).toBeTruthy()
  const list = await listRes.json()
  const child = list.members.find((m: { name: string }) => m.name === `Upgrade Kid ${suffix}`)
  expect(child).toBeTruthy()
  expect(child.upgradeAllowed).toBe(false)

  // 3. Enable upgrade.
  const allowRes = await request.patch(`/api/household/members/${child.id}/allow-upgrade`, {
    data: { allowed: true },
  })
  expect(allowRes.ok()).toBeTruthy()

  // 4. Verify the flag flipped.
  const list2 = await (await request.get('/api/household/members')).json()
  const child2 = list2.members.find((m: { name: string }) => m.name === `Upgrade Kid ${suffix}`)
  expect(child2.upgradeAllowed).toBe(true)

  // 5. The admin (not a child with upgradeAllowed) cannot call the conversion endpoint.
  // The free admin's own membership has upgradeAllowed = false, so the endpoint returns 403.
  const convertRes = await request.post('/api/user/upgrade-account', {
    data: { email: `kid${suffix}@example.com`, password: 'StrongPass1' },
  })
  expect(convertRes.status()).toBe(403)
})
