import { lazyWidget, type WidgetMap } from "@/widgets/lazy-widget";

// Every widget the rfid lessons reference, each in its own chunk (three.js only with the 3D panels).
export const rfidWidgets = {
  rfid: lazyWidget(() => import("./lab/RfidPreview"), "RfidPreview"),
  door: lazyWidget(() => import("./door/DoorPreview"), "DoorPreview"),
  friends: lazyWidget(() => import("./friends/FriendsPreview"), "FriendsPreview"),
  rfidSpi: lazyWidget(() => import("./panels/RfidSpi"), "RfidSpi"),
  rfidScreens: lazyWidget(() => import("./screen/RfidScreens"), "RfidScreens"),
  rfidField3d: lazyWidget(() => import("./three/RfidField3d"), "RfidField3d"),
  rfidSeq: lazyWidget(() => import("./seq/RfidSeq"), "RfidSeq"),
  rfidAnticoll: lazyWidget(() => import("./panels/RfidAnticoll"), "RfidAnticoll"),
  rfidMemory3d: lazyWidget(() => import("./three/RfidMemory3d"), "RfidMemory3d"),
  rfidAccess: lazyWidget(() => import("./panels/RfidAccess"), "RfidAccess"),
  rfidValue: lazyWidget(() => import("./panels/RfidValue"), "RfidValue"),
  rfidEdge: lazyWidget(() => import("./edge/RfidEdge"), "RfidEdge"),
  doorRules: lazyWidget(() => import("./door/DoorRules"), "DoorRules"),
  doorSeq: lazyWidget(() => import("./door/DoorSeq"), "DoorSeq"),
  doorCopy: lazyWidget(() => import("./door/DoorCopy"), "DoorCopy"),
  friendsCast: lazyWidget(() => import("./friends/FriendsCast"), "FriendsCast"),
  friendsSeq: lazyWidget(() => import("./friends/FriendsSeq"), "FriendsSeq"),
} as const satisfies WidgetMap;
