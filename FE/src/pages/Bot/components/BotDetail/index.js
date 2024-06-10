import styles from "./BotDetail.module.scss"
import { Tab, Tabs } from "@mui/material";
import { useState } from "react";
import Overview from "./components/Overview";
import Wallet from "./components/Wallet";
import Api from "./components/Api";
import Setting from "./components/Setting";
import AddBreadcrumbs from "../../../../components/BreadcrumbsCutom";


function BotDetail() {


    const [tabNumber, setTabNumber] = useState("Overview");

    const handleChangeTab = (e, newValue) => {
        setTabNumber(newValue)
    }

    const handleTabContent = () => {
        switch (tabNumber) {
            case "Overview":
                return <Overview />
            case "Wallet":
                return <Wallet />
            case "Api":
                return <Api />
            case "Setting":
                return <Setting />
        }
    }

    return (
        <div className={styles.botDetail}>
            <AddBreadcrumbs list = {["Bots","Detail"]}/>

            <Tabs value={tabNumber} onChange={handleChangeTab}>
                <Tab label="Overview" value="Overview" ></Tab>
                <Tab label="Wallet" value="Wallet"></Tab>
                <Tab label="Api" value="Api"></Tab>
                <Tab label="Setting" value="Setting"></Tab>
            </Tabs>
            <div style={{
                marginTop: "24px"
            }}>
                {handleTabContent()}
            </div>

        </div>
    );
}

export default BotDetail;