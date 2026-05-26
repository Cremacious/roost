import { test, expect } from '@playwright/test'

// Runs under the "free" project (storageState = free admin).
test('common items CRUD round-trip', async ({ request }) => {
  // 1. GET seeds defaults on first call.
  const list1 = await (await request.get('/api/grocery/common-items')).json()
  expect(Array.isArray(list1.items)).toBeTruthy()
  expect(list1.items.length).toBeGreaterThan(0)

  // 2. POST a new item.
  const suffix = Date.now()
  const newName = `E2E Item ${suffix}`
  const create = await request.post('/api/grocery/common-items', { data: { name: newName } })
  expect(create.status()).toBe(201)
  const created = await create.json()
  expect(created.name).toBe(newName)

  // 3. Duplicate POST returns 409.
  const dup = await request.post('/api/grocery/common-items', { data: { name: newName } })
  expect(dup.status()).toBe(409)

  // 4. PATCH renames.
  const renamed = `${newName} renamed`
  const patch = await request.patch(`/api/grocery/common-items/${created.id}`, { data: { name: renamed } })
  expect(patch.ok()).toBeTruthy()
  const patchBody = await patch.json()
  expect(patchBody.name).toBe(renamed)

  // 5. DELETE soft-deletes.
  const del = await request.delete(`/api/grocery/common-items/${created.id}`)
  expect(del.ok()).toBeTruthy()

  // 6. The item no longer appears.
  const list2 = await (await request.get('/api/grocery/common-items')).json()
  expect((list2.items as { id: string }[]).some(i => i.id === created.id)).toBe(false)

  // 7. PATCH on the deleted id returns 404.
  const patchDeleted = await request.patch(`/api/grocery/common-items/${created.id}`, { data: { name: 'no' } })
  expect(patchDeleted.status()).toBe(404)
})
