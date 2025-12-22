export const BOARDS = {
    PLANNING: 2102791281,
    BUILDINGS: 2102791521,
    BUYER_COMM: 5084313857,
    BUYERS: 5088248229,
};

export const COLUMNS = {
    PROJECT_TO_BUILDINGS: "board_relation_mkxw7hzd",
    PROJECT_TO_STORAGE: "board_relation_mkxn3vzy",
    PROJECT_TO_PARKING: "board_relation_mkxn2cv3",
    PROJECT_TO_COMMERCIAL: "board_relation_mkxnfnv",

    BUILDING_TO_APARTMENTS: "board_relation_mky2kp4",
    APARTMENT_NUMBER_TEXT: "text_mkx68kpr",

    // Target Board Columns (Buyer Communication)
    TARGET_PROJECT: "board_relation_mkxndhvh",
    TARGET_BUILDING: "board_relation_mkxnybfq", // Mapped to Apartment ID as per instructions
    TARGET_STORAGE: "board_relation_mkxn8bvt",
    TARGET_PARKING: "board_relation_mkxnbxjg",
    TARGET_COMMERCIAL: "board_relation_mkxn88c0",
    TARGET_BUYERS_CONNECT: "board_relation_mky2jz2k", // Connect Buyer Comm -> Buyers

    // Buyers Board Columns
    BUYER_ID_NUMBER: "text_mky2rjvs",
    BUYER_PHONE: "phone_mky21r5b",
    BUYER_EMAIL: "email_mky2q0k3",
};
