import Image from "../../assets/logo.png";
import SettingsIcon from '@mui/icons-material/Settings';

function Dashboard() {
    return (
        <div className='overflow-hidden mt-5'>
           <div className="text-center"><span className="text-center font-bold text-3xl">WIN BOT</span></div>
            <section className="py-5 lg:py-10 mb-32">
                <div className="container mx-auto">
                    <div className="flex flex-col items-center lg:flex-row gap-x-8">
                        {/* image */}
                        <div
                            className="order-2 lg:order-1"
                            data-aos="fade-right"
                            data-aos-offset="400"
                        >
                            <img src={Image} alt="casset" />
                        </div>
                        {/* text */}
                        <div
                            className="order-1 lg:order-2 max-w-[480px]"
                            data-aos="fade-left"
                            data-aos-offset="400"
                        >
                            <h2 className="text-2xl lg:text-[40px] font-bold leading-normal mb-6">Why you Should choose WinBot</h2>
                            <p className="mt-6 mb-8 text-slate-600">
                                Experience the next generation cryptocurrency platform. No
                                financial borders, extra fees, and fake reviews.
                            </p>
                            {/* <button className="btn px-6 bg-orange-500 rounded-xl py-2 text-lg font-semibold text-white">Learn more</button> */}
                        </div>
                    </div>
                </div>
            </section>
        </div>

    );
}

export default Dashboard;