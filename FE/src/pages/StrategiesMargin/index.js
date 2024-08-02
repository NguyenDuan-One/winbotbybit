import { Tabs, Tab } from "@mui/material";
import AddBreadcrumbs from "../../components/BreadcrumbsCutom";
import Margin from "./tabComponents/Margin";
import Spot from "./tabComponents/Spot";
import { useState } from "react";


function StrategiesMargin() {

    const [tabNumber, setTabNumber] = useState("Spot");

    const handleChangeTab = (e, newValue) => {
        setTabNumber(newValue)
    }

    const handleTabContent = () => {
        switch (tabNumber) {
            case "Spot":
                return <Spot />
            case "Margin":
                return <Margin />
        }
    }
    return (
        <div>

            <Tabs value={tabNumber} onChange={handleChangeTab}>
                <Tab label="Spot" value="Spot"></Tab>
                <Tab label="Margin" value="Margin" ></Tab>
            </Tabs>
          
                {handleTabContent()}
        </div>
    );
}

export default StrategiesMargin;