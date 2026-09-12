import fs from "node:fs";
import path from "node:path";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteObject,
  getBytes,
  listAll,
  ref,
  uploadBytes,
} from "firebase/storage";

const projectId = "goldmarket-storage-rules-test";
const rules = fs.readFileSync(
  path.resolve(import.meta.dirname, "../../storage.rules"),
  "utf8"
);

let env;

const imageBytes = () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

async function seedObject(objectPath, contentType = "image/jpeg") {
  await env.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(context.storage(), objectPath), imageBytes(), {
      contentType,
    });
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    storage: { rules },
  });
});

after(async () => {
  await env.cleanup();
});

test("프로필 사진은 비로그인·다른 회원이 읽지 못하고 본인·관리자만 읽는다", async () => {
  const objectPath = "profilePhotos/owner/read-access.jpg";
  await seedObject(objectPath);

  const publicStorage = env.unauthenticatedContext().storage();
  const ownerStorage = env.authenticatedContext("owner").storage();
  const otherStorage = env.authenticatedContext("other").storage();
  const adminStorage = env
    .authenticatedContext("admin", { admin: true })
    .storage();

  await assertFails(getBytes(ref(publicStorage, objectPath)));
  await assertSucceeds(getBytes(ref(ownerStorage, objectPath)));
  await assertFails(getBytes(ref(otherStorage, objectPath)));
  await assertSucceeds(getBytes(ref(adminStorage, objectPath)));
});

test("프로필 사진 디렉터리는 클라이언트가 목록 조회할 수 없다", async () => {
  await seedObject("profilePhotos/owner/list-blocked.jpg");

  const ownerStorage = env.authenticatedContext("owner").storage();
  const adminStorage = env
    .authenticatedContext("admin", { admin: true })
    .storage();

  await assertFails(listAll(ref(ownerStorage, "profilePhotos/owner")));
  await assertFails(listAll(ref(adminStorage, "profilePhotos/owner")));
});

test("회원은 자신의 프로필 경로에만 이미지 파일을 업로드할 수 있다", async () => {
  const ownerStorage = env.authenticatedContext("owner").storage();

  await assertSucceeds(
    uploadBytes(
      ref(ownerStorage, "profilePhotos/owner/valid.jpg"),
      imageBytes(),
      { contentType: "image/jpeg" }
    )
  );

  await assertFails(
    uploadBytes(
      ref(ownerStorage, "profilePhotos/other/forged.jpg"),
      imageBytes(),
      { contentType: "image/jpeg" }
    )
  );

  await assertFails(
    uploadBytes(
      ref(ownerStorage, "profilePhotos/owner/not-image.txt"),
      new TextEncoder().encode("not an image"),
      { contentType: "text/plain" }
    )
  );
});

test("레거시 profiles 경로도 동일하게 본인·관리자만 직접 읽는다", async () => {
  const objectPath = "profiles/owner/legacy.jpg";
  await seedObject(objectPath);

  const publicStorage = env.unauthenticatedContext().storage();
  const ownerStorage = env.authenticatedContext("owner").storage();
  const otherStorage = env.authenticatedContext("other").storage();
  const adminStorage = env
    .authenticatedContext("admin", { superAdmin: true })
    .storage();

  await assertFails(getBytes(ref(publicStorage, objectPath)));
  await assertSucceeds(getBytes(ref(ownerStorage, objectPath)));
  await assertFails(getBytes(ref(otherStorage, objectPath)));
  await assertSucceeds(getBytes(ref(adminStorage, objectPath)));
});

test("프로필 사진 삭제는 본인·관리자에게만 허용된다", async () => {
  const ownerPath = "profilePhotos/owner/delete-owner.jpg";
  const otherDeniedPath = "profilePhotos/owner/delete-other-denied.jpg";
  const adminPath = "profilePhotos/owner/delete-admin.jpg";
  await seedObject(ownerPath);
  await seedObject(otherDeniedPath);
  await seedObject(adminPath);

  const ownerStorage = env.authenticatedContext("owner").storage();
  const otherStorage = env.authenticatedContext("other").storage();
  const adminStorage = env
    .authenticatedContext("admin", { admin: true })
    .storage();

  await assertSucceeds(deleteObject(ref(ownerStorage, ownerPath)));
  await assertFails(deleteObject(ref(otherStorage, otherDeniedPath)));
  await assertSucceeds(deleteObject(ref(adminStorage, adminPath)));
});

test("정의되지 않은 Storage 경로는 계속 거부된다", async () => {
  const ownerStorage = env.authenticatedContext("owner").storage();

  await assertFails(
    uploadBytes(
      ref(ownerStorage, "public/arbitrary.jpg"),
      imageBytes(),
      { contentType: "image/jpeg" }
    )
  );
});
