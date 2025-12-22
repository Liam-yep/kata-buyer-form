import React, { useState, useEffect } from "react";
import "@vibe/core/tokens";
import "./BuyerForm.css";
import { Button, Loader, TextField, Dropdown, Box, Flex, Icon } from "@vibe/core";
import { Check } from "@vibe/icons";
import MondayService from "../../services/MondayService";
import { useMonday } from "../../context/MondayContext";

const Context = {
    MarginBottom: 24
}

const BuyerForm = () => {
    const { monday } = useMonday();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Data Options
    const [projects, setProjects] = useState([]);
    const [buildings, setBuildings] = useState([]);
    const [apartments, setApartments] = useState([]);
    const [storages, setStorages] = useState([]);
    const [parkings, setParkings] = useState([]);
    const [commercials, setCommercials] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        buyerName: "",
        buyerPhone: "",
        buyerEmail: "",
        projectId: null,
        buildingId: null,
        apartmentId: null,
        storageId: null,
        parkingId: null,
        commercialId: null,
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const projs = await MondayService.getProjects();
            setProjects(projs.map(p => ({ label: p.name, value: p.id })));
        } catch (e) {
            console.error("Failed to load projects", e);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = async (option) => {
        if (!option) {
            setFormData(prev => ({ ...prev, projectId: null, buildingId: null, apartmentId: null, storageId: null, parkingId: null, commercialId: null }));
            setBuildings([]);
            setStorages([]);
            setParkings([]);
            setCommercials([]);
            return;
        }

        setFormData(prev => ({ ...prev, projectId: option.value, buildingId: null, apartmentId: null }));
        setLoading(true);

        try {
            const details = await MondayService.getProjectDetails(option.value);
            if (details) {
                // Fetch names for all linked items to populate dropdowns
                const [builds, stors, parks, comms] = await Promise.all([
                    MondayService.getItemsNames(details.buildingIds),
                    MondayService.getItemsNames(details.storageIds),
                    MondayService.getItemsNames(details.parkingIds),
                    MondayService.getItemsNames(details.commercialIds)
                ]);

                setBuildings(builds.map(i => ({ label: i.name, value: i.id })));
                setStorages(stors.map(i => ({ label: i.name, value: i.id })));
                setParkings(parks.map(i => ({ label: i.name, value: i.id })));
                setCommercials(comms.map(i => ({ label: i.name, value: i.id })));
            }
        } catch (e) {
            console.error("Failed to load project details", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuildingChange = async (option) => {
        if (!option) {
            setFormData(prev => ({ ...prev, buildingId: null, apartmentId: null }));
            setApartments([]);
            return;
        }

        setFormData(prev => ({ ...prev, buildingId: option.value, apartmentId: null }));
        setLoading(true);

        try {
            const apts = await MondayService.getApartmentOptions(option.value);
            setApartments(apts.map(a => ({ label: a.label, value: a.id })));
        } catch (e) {
            console.error("Failed to load apartments", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.buyerName || !formData.projectId || !formData.buildingId || !formData.apartmentId) {
            monday.execute("notice", {
                message: "Please fill in all required fields (Name, Project, Building, Apartment)",
                type: "error",
                timeout: 3000
            });
            return;
        }

        setSubmitting(true);
        try {
            await Promise.all([
                MondayService.createBuyerCommunication(formData),
                MondayService.createBuyerRecord(formData)
            ]);
            setSuccess(true);
        } catch (e) {
            console.error("Submission failed", e);
            monday.execute("notice", {
                message: "Failed to submit form. Please try again.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSuccess(false);
        setFormData({
            buyerName: "",
            buyerPhone: "",
            buyerEmail: "",
            projectId: null,
            buildingId: null,
            apartmentId: null,
            storageId: null,
            parkingId: null,
            commercialId: null,
        });
        setBuildings([]);
        setApartments([]);
        setStorages([]);
        setParkings([]);
        setCommercials([]);
    };

    if (loading && !formData.projectId && !formData.buildingId) {
        return <div style={{ display: 'flex', justifyContent: 'center' }}><Loader size={64} /></div>;
    }

    if (success) {
        return (
            <div className="buyer-form-card success-message">
                <Icon icon={Check} iconSize={64} style={{ color: "var(--positive-color)" }} />
                <h2>הטופס נשלח בהצלחה</h2>
                <Button onClick={resetForm}>הזנת טופס חדש</Button>
            </div>
        );
    }

    return (
        <div className="buyer-form-card">
            <h1 className="buyer-form-title">טופס התקשרות עם רוכש</h1>

            <Box marginBottom={Context.MarginBottom}>
                <TextField
                    title="שם מלא"
                    placeholder="הכנס שם מלא"
                    value={formData.buyerName}
                    onChange={val => setFormData({ ...formData, buyerName: val })}
                    size={TextField.sizes.LARGE}
                    required
                />
            </Box>

            <Flex gap={16} style={{ width: '100%', marginBottom: '16px' }}>
                <TextField
                    title="טלפון"
                    placeholder="050-0000000"
                    value={formData.buyerPhone}
                    onChange={val => setFormData({ ...formData, buyerPhone: val })}
                    size={TextField.sizes.LARGE}
                />
                <TextField
                    title="אימייל"
                    placeholder="example@mail.com"
                    value={formData.buyerEmail}
                    onChange={val => setFormData({ ...formData, buyerEmail: val })}
                    size={TextField.sizes.LARGE}
                />
            </Flex>

            <Box marginBottom={Context.MarginBottom}>
                <Dropdown
                    placeholder="בחר פרויקט"
                    options={projects}
                    onChange={handleProjectChange}
                    value={projects.find(p => p.value === formData.projectId)}
                    size={Dropdown.sizes.LARGE}
                    searchable
                    clearable={false}
                />
            </Box>

            {formData.projectId && (
                <Box marginBottom={Context.MarginBottom}>
                    <Dropdown
                        placeholder="בחר בניין"
                        options={buildings}
                        onChange={handleBuildingChange}
                        value={buildings.find(b => b.value === formData.buildingId)}
                        disabled={buildings.length === 0}
                        size={Dropdown.sizes.LARGE}
                        searchable
                        clearable={false}
                    />
                </Box>
            )}

            {formData.buildingId && (
                <Box marginBottom={Context.MarginBottom}>
                    <Dropdown
                        placeholder="בחר דירה"
                        options={apartments}
                        onChange={o => setFormData({ ...formData, apartmentId: o?.value })}
                        value={apartments.find(a => a.value === formData.apartmentId)}
                        disabled={apartments.length === 0}
                        size={Dropdown.sizes.LARGE}
                        searchable
                        clearable={false}
                    />
                </Box>
            )}

            {/* Optional Fields Group */}
            {formData.projectId && (
                <>
                    <div style={{ borderTop: '1px solid #e1e1e1', margin: '16px 0' }}></div>
                    <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>תוספות (אופציונלי)</h3>

                    <Flex gap={16} wrap>
                        <Box flex={1}>
                            <Dropdown
                                placeholder="מחסן"
                                options={storages}
                                onChange={o => setFormData({ ...formData, storageId: o?.value })}
                                value={storages.find(s => s.value === formData.storageId)}
                                disabled={storages.length === 0}
                            />
                        </Box>
                        <Box flex={1}>
                            <Dropdown
                                placeholder="חניה"
                                options={parkings}
                                onChange={o => setFormData({ ...formData, parkingId: o?.value })}
                                value={parkings.find(p => p.value === formData.parkingId)}
                                disabled={parkings.length === 0}
                            />
                        </Box>
                        <Box flex={1}>
                            <Dropdown
                                placeholder="יח' מסחר"
                                options={commercials}
                                onChange={o => setFormData({ ...formData, commercialId: o?.value })}
                                value={commercials.find(c => c.value === formData.commercialId)}
                                disabled={commercials.length === 0}
                            />
                        </Box>
                    </Flex>
                </>
            )}

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleSubmit} loading={submitting} size={Button.sizes.LARGE}>
                    שלח טופס
                </Button>
            </div>

        </div>
    );
};

export default BuyerForm;
