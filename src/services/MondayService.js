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
    const query = `query {
      boards(ids: [${BOARDS.PLANNING}]) {
        items_page(limit: 100) {
          items {
            id
            name
          }
        }
      }
    }`;
    const data = await this.api(query);
    return data.boards[0]?.items_page?.items || [];
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
    const data = await this.api(query, { projectId: [projectId] });
    const item = data.items[0];
    if (!item) return null;

    const findLinkedIds = (colId) => {
      const col = item.column_values.find(c => c.id === colId);
      return col?.linked_item_ids ? JSON.parse(col.linked_item_ids) : [];
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
    const apartmentIds = col?.linked_item_ids ? JSON.parse(col.linked_item_ids) : [];

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

  async createBuyerCommunication(formData) {
    // formData: { projectName, projectId, buyerName, buyerPhone, buyerEmail, apartmentId, storageId, parkingId, commercialId }

    const itemName = `פנייה חדשה - ${formData.buyerName}`;

    const columnValues = {
      [COLUMNS.TARGET_PROJECT]: { item_ids: [parseInt(formData.projectId)] },
    };

    if (formData.apartmentId) columnValues[COLUMNS.TARGET_BUILDING] = { item_ids: [parseInt(formData.apartmentId)] };
    if (formData.storageId) columnValues[COLUMNS.TARGET_STORAGE] = { item_ids: [parseInt(formData.storageId)] };
    if (formData.parkingId) columnValues[COLUMNS.TARGET_PARKING] = { item_ids: [parseInt(formData.parkingId)] };
    if (formData.commercialId) columnValues[COLUMNS.TARGET_COMMERCIAL] = { item_ids: [parseInt(formData.commercialId)] };

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

  async createBuyerRecord(formData) {
    // Create record in "Buyers" (5088248229)
    const query = `mutation($boardId: ID!, $itemName: String!) {
      create_item(board_id: $boardId, item_name: $itemName) {
        id
      }
    }`;
    return this.api(query, {
      boardId: BOARDS.BUYERS,
      itemName: formData.buyerName
    });
  }
}

export default new MondayService();
