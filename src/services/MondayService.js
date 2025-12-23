import mondaySdk from "monday-sdk-js";
import { BOARDS, COLUMNS } from "../config/monday-config";

const monday = mondaySdk();

class MondayService {
  async api(query, variables = {}) {
    try {
      const response = await monday.api(query, { variables });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return response.data;
    } catch (err) {
      console.error("Monday API Error:", err);
      throw err;
    }
  }

  async getProjects() {
    let allItems = [];
    let cursor = null;

    do {
      let query;
      if (!cursor) {
        // Initial Query
        query = `query {
          boards(ids: [${BOARDS.PLANNING}]) {
            items_page(limit: 500) {
              cursor
              items {
                id
                name
              }
            }
          }
        }`;
      } else {
        // Pagination Query
        query = `query {
          next_items_page(cursor: "${cursor}", limit: 500) {
            cursor
            items {
              id
              name
            }
          }
        }`;
      }

      const data = await this.api(query);

      let pageData;
      if (!cursor) {
        pageData = data.boards[0]?.items_page;
      } else {
        pageData = data.next_items_page;
      }

      if (pageData) {
        allItems = allItems.concat(pageData.items || []);
        cursor = pageData.cursor;
      } else {
        cursor = null;
      }

    } while (cursor);

    return allItems;
  }

  async getProjectDetails(projectId) {
    const query = `query($projectId: [ID!]) {
      items(ids: $projectId) {
        column_values(ids: ["${COLUMNS.PROJECT_TO_BUILDINGS}", "${COLUMNS.PROJECT_TO_STORAGE}", "${COLUMNS.PROJECT_TO_PARKING}", "${COLUMNS.PROJECT_TO_COMMERCIAL}"]) {
          id
          ... on BoardRelationValue {
            linked_item_ids
            display_value
          }
        }
      }
    }`;
    console.log("getProjectDetails", query);
    const data = await this.api(query, { projectId: [projectId] });
    const item = data.items[0];
    if (!item) return null;

    const findLinkedIds = (colId) => {
      const col = item.column_values.find(c => c.id === colId);
      if (!col?.linked_item_ids) return [];

      if (Array.isArray(col.linked_item_ids)) return col.linked_item_ids;

      try {
        return JSON.parse(col.linked_item_ids);
      } catch (e) {
        console.error(`Failed to parse linked_item_ids for column ${colId}`, col.linked_item_ids, e);
        return [];
      }
    };

    return {
      buildingIds: findLinkedIds(COLUMNS.PROJECT_TO_BUILDINGS),
      storageIds: findLinkedIds(COLUMNS.PROJECT_TO_STORAGE),
      parkingIds: findLinkedIds(COLUMNS.PROJECT_TO_PARKING),
      commercialIds: findLinkedIds(COLUMNS.PROJECT_TO_COMMERCIAL)
    };
  }

  async getItemsNames(itemIds) {
    if (!itemIds || itemIds.length === 0) return [];

    // We fetch simple names for Buildings / Storage / Parking / Commercial
    const query = `query($ids: [ID!]) {
      items(ids: $ids) {
        id
        name
      }
    }`;
    const data = await this.api(query, { ids: itemIds });
    return data.items || [];
  }

  async getApartmentOptions(buildingId) {
    // 1. Get linked apartments from the building item
    const queryBuilding = `query($id: [ID!]) {
      items(ids: $id) {
        column_values(ids: ["${COLUMNS.BUILDING_TO_APARTMENTS}"]) {
          ... on BoardRelationValue {
            linked_item_ids
          }
        }
      }
    }`;
    const buildingData = await this.api(queryBuilding, { id: [buildingId] });
    const col = buildingData.items[0]?.column_values[0];

    let apartmentIds = [];
    if (col?.linked_item_ids) {
      if (Array.isArray(col.linked_item_ids)) {
        apartmentIds = col.linked_item_ids;
      } else {
        try {
          apartmentIds = JSON.parse(col.linked_item_ids);
        } catch (e) {
          console.error("Failed to parse apartment linked_item_ids", col.linked_item_ids, e);
        }
      }
    }

    if (apartmentIds.length === 0) return [];

    // 2. Fetch Apartment Number text
    const queryApts = `query($ids: [ID!]) {
      items(ids: $ids) {
        id
        name 
        column_values(ids: ["${COLUMNS.APARTMENT_NUMBER_TEXT}"]) {
          text
        }
      }
    }`;
    const aptData = await this.api(queryApts, { ids: apartmentIds });

    return aptData.items.map(item => ({
      id: item.id,
      name: item.name, // Fallback
      label: item.column_values[0]?.text || item.name // Prefer text column
    }));
  }

  async createBuyerCommunication(formData, buyerIds = []) {
    // formData: { projectId, buildingId, apartmentId, storageId, parkingId, commercialId, buyers: ... }

    const buyersName = formData.buyers.map(b => b.fullName).join(" & ");
    const itemName = `פנייה חדשה - ${buyersName}`;

    const columnValues = {
      [COLUMNS.TARGET_PROJECT]: { item_ids: [parseInt(formData.projectId)] },
    };

    if (formData.apartmentId) columnValues[COLUMNS.TARGET_BUILDING] = { item_ids: [parseInt(formData.apartmentId)] };
    if (formData.storageId) columnValues[COLUMNS.TARGET_STORAGE] = { item_ids: [parseInt(formData.storageId)] };
    if (formData.parkingId) columnValues[COLUMNS.TARGET_PARKING] = { item_ids: [parseInt(formData.parkingId)] };
    if (formData.commercialId) columnValues[COLUMNS.TARGET_COMMERCIAL] = { item_ids: [parseInt(formData.commercialId)] };

    // Connect Buyers
    if (buyerIds && buyerIds.length > 0) {
      columnValues[COLUMNS.TARGET_BUYERS_CONNECT] = { item_ids: buyerIds.map(id => parseInt(id)) };
    }

    const query = `mutation($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }`;

    return this.api(query, {
      boardId: BOARDS.BUYER_COMM,
      itemName,
      columnValues: JSON.stringify(columnValues)
    });
  }

  async findBuyerByTeudatZehut(idNumber) {
    const query = `query {
      items_page_by_column_values(
        limit: 1,
        board_id: ${BOARDS.BUYERS},
        columns: [{column_id: "${COLUMNS.BUYER_ID_NUMBER}", column_values: ["${idNumber}"]}]
      ) {
        items {
          id
        }
      }
    }`;

    try {
      const data = await this.api(query);
      const items = data.items_page_by_column_values?.items;
      if (items && items.length > 0) {
        return items[0].id; // Found existing buyer
      }
    } catch (e) {
      console.error("Error finding buyer by ID", e);
    }
    return null;
  }

  async createBuyerRecord(formData) {
    // Create record in "Buyers" (5088248229) for each buyer
    const createQuery = `mutation($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
      }
    }`;

    const processBuyer = async (buyer) => {
      // 1. Check if buyer exists
      if (buyer.idNumber) {
        const existingId = await this.findBuyerByTeudatZehut(buyer.idNumber);
        if (existingId) {
          console.log(`Buyer with ID ${buyer.idNumber} already exists: ${existingId}`);
          return existingId;
        }
      }

      // 2. Create new if not found
      const columnValues = {
        [COLUMNS.BUYER_ID_NUMBER]: buyer.idNumber,
        [COLUMNS.BUYER_PHONE]: { phone: buyer.phone, countryShortName: "IL" },
        [COLUMNS.BUYER_EMAIL]: { email: buyer.email, text: buyer.email }
      };

      const res = await this.api(createQuery, {
        boardId: BOARDS.BUYERS,
        itemName: buyer.fullName,
        columnValues: JSON.stringify(columnValues)
      });
      return res.create_item.id;
    };

    const promises = formData.buyers.map(b => processBuyer(b));
    return Promise.all(promises);
  }
}

export default new MondayService();
